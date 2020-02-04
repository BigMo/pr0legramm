import * as Key from 'node-rsa';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const KEYFILE_NAME: string = 'pr0legrammbot.key';

/* Unused, may come in handy some day */
export default class RSAWrapper {
	private privateKey: Key;
	private publicKey: Key;

	private static privateKeyFile(): string {
		return `${KEYFILE_NAME}.priv.pem`;
	}
	private static publicKeyFile(): string {
		return `${KEYFILE_NAME}.pub.pem`;
	}

	constructor() {}

	private static checkKeyFiles(): Promise<boolean> {
		return Promise.all([ exists(RSAWrapper.privateKeyFile()), exists(RSAWrapper.publicKeyFile()) ]).then((exist) =>
			Promise.resolve(exist.filter((e) => e === true).length == exist.length)
		);
	}
	private static checkCreateKeyFiles(): Promise<Key[]> {
		let key: Key = new Key();
		return this.checkKeyFiles().then((has) => {
			if (has)
				return Promise.all([
					readFile(RSAWrapper.privateKeyFile()),
					readFile(RSAWrapper.publicKeyFile())
				]).then((keyFiles) => {
					return Promise.resolve([ key.importKey(keyFiles[0]), key.importKey(keyFiles[1]) ]);
				});
			let pair: Key = key.generateKeyPair();
			return Promise.all([
				writeFile(RSAWrapper.privateKeyFile(), pair.exportKey('private')),
				writeFile(RSAWrapper.publicKeyFile(), pair.exportKey('public'))
			]).then(() => {
				return Promise.resolve([ pair, pair ]);
			});
		});
	}

	init(): Promise<void> {
		return RSAWrapper.checkCreateKeyFiles().then((keys) => {
			this.privateKey = keys[0];
			this.publicKey = keys[1];
		});
	}

	public decrypt(data: Buffer): Promise<Buffer> {
		return new Promise((res, rej) => {
			try {
				res(this.privateKey.decrypt(data));
			} catch (err) {
				rej(err);
			}
		});
	}

	public encrypt(data: Buffer): Promise<Buffer> {
		return new Promise((res, rej) => {
			try {
				res(this.publicKey.encrypt(data));
			} catch (err) {
				rej(err);
			}
		});
	}
}
