import * as fs from 'fs';
import * as util from 'util';
import { Pr0legrammBot, Pr0legrammBotConfig } from './middleware/pr0legrammbot';
const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const CONFIG: string = process.env.CONFIG_FILE || 'pr0legrammbot.json';

exists(CONFIG)
	.then((exists) => {
		if (!exists) {
			console.error(`Missing config file \"${CONFIG}\"; attempting to create sample file`);
			let sample = Pr0legrammBot.sampleConfig();
			return writeFile(CONFIG, JSON.stringify(sample)).then(() => {
				throw new Error('Created sample config file.');
			});
		}

		return readFile(CONFIG, { encoding: 'utf-8' });
	})
	.then((json) => {
		let config: Pr0legrammBotConfig = new Pr0legrammBotConfig(JSON.parse(json));
		var bot = new Pr0legrammBot(config);
		bot.on('save', (cfg: Pr0legrammBotConfig) => {
			let cookies = {};
			cfg.cookies.forEach((cookie, id) => cookies[id] = cookie);
			let data = {
				telegramBotToken: cfg.telegramBotToken,
				verbose: cfg.verbose,
				cookies: cookies
			};
			writeFile(CONFIG, JSON.stringify(data))
				.then(() => {
				console.log('+> Saved updated config file!');
			}).catch(err=>console.error(err));
		});
		bot.run();
	})
	.catch((err) => {
		console.error('pr0legrammbot aborted:');
		console.error(err);
	});
