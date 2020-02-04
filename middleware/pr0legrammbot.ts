import * as path from 'path';
import { Pr0grammAPI, NodeRequester, ItemFlags, Item, APIRequester, GetItemsResponse, MeCookie } from 'pr0gramm-api';
import { InlineQuery, InlineQueryResult } from 'telegraf/typings/telegram-types';
import Telegraf, {
	ContextMessageUpdate,
	Extra,
	Markup,
	Stage,
	BaseScene,
	session,
	SceneContextMessageUpdate,
	Middleware
} from 'telegraf';
import * as events from 'events';

const DEFAULT_API: Pr0grammAPI = Pr0grammAPI.create(NodeRequester.create());
const ACTION_KEYBOARD = Markup.keyboard([
	Markup.button('/setcookie'),
	Markup.button('/testcookie'),
	Markup.button('/deletecookie')
]).oneTime();

export class Pr0legrammBotConfig {
	cookies: Map<number, Pr0grammSessionCookie>;
	telegramBotToken: string;
	verbose?: boolean;

	constructor(jsonData: Object) {
		if (jsonData === undefined || jsonData == null) throw new Error('Missing bot config data');
		this.verbose = jsonData['verbose'] !== undefined ? jsonData['verbose'] === true : false;
		this.telegramBotToken = jsonData['telegramBotToken'];
		this.cookies = new Map<number, Pr0grammSessionCookie>();
		if (jsonData['cookies']) {
			Object.keys(jsonData['cookies']).forEach((id) => {
				this.cookies.set(parseInt(id), new Pr0grammSessionCookie(jsonData['cookies'][id]));
			});
		}
	}
}

export class Pr0grammSessionCookie implements MeCookie {
	lv: number;
	n: string;
	id: string;
	fl: number;
	a: number;
	pp: boolean;
	paid: boolean;
	t: number;
	vv: number;
	vm: false;

	constructor(jsonData: Object) {
		this.lv = jsonData['lv'];
		this.n = jsonData['n'];
		this.id = jsonData['id'];
		this.a = jsonData['a'];
		this.pp = jsonData['pp'];
		this.paid = jsonData['paid'];
		this.t = jsonData['t'];
		this.vv = jsonData['vv'];
		this.vm = jsonData['vm'];
		this.fl = jsonData['fl'];
	}
}

enum UserState {
	None = 0,
	SettingToken = 1
}

export interface Pr0legrammBot {
	on(event: 'save', listener: (config: Pr0legrammBotConfig) => void): this;
}

export class Pr0legrammBot extends events.EventEmitter {
	private bot: Telegraf<ContextMessageUpdate>;
	private verbose: boolean;
	private config: Pr0legrammBotConfig;

	constructor(config: Pr0legrammBotConfig) {
		super();
		if (!config) throw new Error('Missing config');

		this.bot = new Telegraf(config.telegramBotToken);
		this.verbose = config.verbose ? true : false;
		this.config = config;
	}

	private emitSave(): void {
		this.emit('save', this.config);
	}

	private hasCookieForUser(id: number): boolean {
		return id && this.config.cookies.has(id);
	}

	private getAPIAccessForUser(id: number): Pr0grammAPI {
		if (this.hasCookieForUser(id))
			return Pr0grammAPI.create(
				NodeRequester.create('https://pr0gramm.com', { me: JSON.stringify(this.config.cookies.get(id)) })
			);
		return DEFAULT_API;
	}

	run() {
		this.bot.help((ctx) => ctx.replyWithMarkdown('Verfügbare Befehle: `/setcookie` `/testcookie` `/deletecookie`'));
		this.bot.start((ctx) =>
			ctx.replyWithMarkdown(
				'Verfügbare Befehle: `/setcookie` `/testcookie` `/deletecookie`',
				Extra.markup(ACTION_KEYBOARD)
			)
		);

		const setcookie = new BaseScene('setcookie');
		setcookie.enter((ctx) => ctx.replyWithMarkdown('Gib dein Session-Cookie als `JSON` ein:'));
		setcookie.command('Abbrechen', (ctx) => setcookie.leave());
		setcookie.on('message', (ctx) => {
			if (ctx.message.text) {
				try {
					var cookie = new Pr0grammSessionCookie(JSON.parse(ctx.message.text));
					this.config.cookies.set(ctx.from.id, cookie);
				} catch (err) {
					return ctx.replyWithMarkdown(`❌ **Fehler:** ${err}`);
				}
				this.emitSave();
				ctx.reply('✔️ Cookie gesetzt!');
				setcookie.leave();
			} else {
				ctx.replyWithMarkdown('❌ **Fehler:** Leerer Cookie!');
			}
		});

		const testcookie = new BaseScene('testcookie');
		testcookie.enter((ctx) => {
			if (!this.hasCookieForUser(ctx.from.id))
				return ctx.replyWithMarkdown('❌ **Fehler:** Kein Cookie hinterlegt!');
			var api = this.getAPIAccessForUser(ctx.from.id);
			api.user
				.getInfo()
				.then((info) => ctx.replyWithMarkdown(`✔️ Erfolg, E-Mail: \`...@${info.account.email.split('@')[1]}\``))
				.catch((err) => ctx.replyWithMarkdown(`❌ **Fehler:** ${err}`))
				.finally(() => testcookie.leave());
		});

		const deleteCookie = new BaseScene('deletecookie');
		deleteCookie.enter((ctx) => {
			if (!this.hasCookieForUser(ctx.from.id))
				return ctx.replyWithMarkdown('❌ **Fehler:** Kein Cookie hinterlegt!');
			this.config.cookies.delete(ctx.from.id);
			this.emitSave();
			ctx.reply('✔️ Cookie gelöscht!');
		});

		const stage = new Stage([ setcookie, testcookie, deleteCookie ], { ttl: 10 });
		stage.command('setcookie', (ctx) => ctx.scene.enter('setcookie'));
		stage.command('testcookie', (ctx) => ctx.scene.enter('testcookie'));
		stage.command('deletecookie', (ctx) => ctx.scene.enter('deletecookie'));
		this.bot.use(session());
		this.bot.use(stage.middleware());

		this.bot.on('inline_query', ({ answerInlineQuery, inlineQuery }) => {
			if (this.verbose) console.log(`#> Incoming query: \'${inlineQuery.query}\'`);

			var info = Pr0legrammBot.parseQuery(inlineQuery);

			if (this.verbose) {
				if (info) console.log(info);
				else console.log(`!> INVALID QUERY`);
			}

			if (info == null) return;

			let api = this.getAPIAccessForUser(inlineQuery.from.id);
			this.getPosts(api, info)
				.then((items) => {
					if (this.verbose) console.log(`#> Received ${items.length} items!`);

					var results = Pr0legrammBot.postsToResults(items);

					if (this.verbose) console.log(`#> Turned into ${results.length} results!`);
					if (!results.length) return answerInlineQuery([]); //Make Telegram show 'No results.'

					return answerInlineQuery(results, {
						next_offset: Math.min(...results.map((r) => parseInt(r.id))).toString(), //Next offset => oldest post ID
						cache_time: 60,
						is_personal: this.hasCookieForUser(inlineQuery.from.id)
					}).then((res) => {
						if (this.verbose) console.log(`Success: ${res}`);
						return res;
					});
				})
				.catch(console.error);
		});

		this.bot.catch((err) => {
			console.log(err);
		});
		this.bot.startPolling();
	}

	static postsToResults(items: Item[]): InlineQueryResult[] {
		return items
			.map((item, idx) => {
				var caption = `\`>_\` [${item.id}](https://pr0gramm.com/new/${item.id})`;
				switch (path.extname(item.image).toLocaleLowerCase()) {
					case '.jpg':
						return {
							type: 'photo',
							id: item.id.toString(),
							photo_url: `https://img.pr0gramm.com/${item.image}`,
							thumb_url: `https://img.pr0gramm.com/${item.image}`,
							caption: caption,
							parse_mode: 'Markdown'
						};
					case '.gif':
						return {
							type: 'gif',
							id: item.id.toString(),
							gif_url: `https://img.pr0gramm.com/${item.image}`,
							thumb_url: `https://img.pr0gramm.com/${item.image}`,
							caption: caption,
							parse_mode: 'Markdown'
						};
					case '.mp4':
						return {
							type: 'mpeg4_gif',
							id: item.id.toString(),
							mpeg4_url: `https://vid.pr0gramm.com/${item.image}`,
							thumb_url: `https://thumb.pr0gramm.com/${item.thumb}`,
							caption: caption,
							parse_mode: 'Markdown'
						};
					default:
						return null;
				}
			})
			.filter((a) => a != null) //Remove invalid posts
			.filter((a, i) => i < 50); //Limit to 50 posts
	}

	getPosts(api: Pr0grammAPI, info: QueryInfo): Promise<Item[]> {
		let getItems: Promise<GetItemsResponse> = info.hasOffset
			? api.items.getItemsOlder({
					promoted: false,
					flags: info.flags,
					tags: info.tags,
					older: info.offset
				})
			: api.items.getItems({
					promoted: true,
					flags: info.flags,
					tags: info.tags
				});
		return getItems.then((response) => {
			return response.items;
		});
	}

	static parseQuery(inlineQuery: InlineQuery): QueryInfo {
		let info = new QueryInfo();

		let args: string[] =
			inlineQuery.query && inlineQuery.query.length
				? inlineQuery.query.split(/\s+/).filter((p) => p.length > 0)
				: [];

		if (inlineQuery.offset.length) {
			info.hasOffset = true;
			info.offset = parseInt(inlineQuery.offset);
		} else {
			info.hasOffset = false;
		}

		args.forEach((arg) => {
			switch (arg.toLowerCase()) {
				case '+sfw':
					info.flags |= ItemFlags.SFW;
					break;
				case '+nsfw':
					info.flags |= ItemFlags.NSFW;
					break;
				case '+nsfl':
					info.flags |= ItemFlags.NSFL;
					break;
				case '+nsfp':
					info.flags |= ItemFlags.NSFP;
					break;
				case '+all':
					info.flags |= ItemFlags.All;
					break;
				default:
					return;
			}
			//Remove filters from tags
			args = args.filter((t) => t.toLowerCase() != arg);
		});

		info.tags = args;
		//Set to SFW if nothing else is set
		if (info.flags == undefined) info.flags = ItemFlags.SFW;

		return info;
	}

	static sampleConfig(): Pr0legrammBotConfig {
		return new Pr0legrammBotConfig({
			telegramBotToken: '0123456789:XXXXXXXXXXXXXXXXXXXXXX',
			cookies: {},
			verbose: false
		});
	}
}

class QueryInfo {
	hasOffset: boolean;
	offset: number;
	tags: string[];
	flags: ItemFlags;
}
