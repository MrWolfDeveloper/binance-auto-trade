const MTP = require(`${__dirname}/components/telegram/mtproto`);
const { phone_number, channels_monitor } = require(`${__dirname}/storage/connection-data.json`);

const ReadLine = require('readline');
const FS = require('fs');

function IsInMonitorChannels(ChannelID) {
	console.log(ChannelID);
	return channels_monitor.filter((CHData) => CHData.channel_id === ChannelID);
}

function AskQuestion(Query) {
	const RL = ReadLine.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((Resolve) =>
		RL.question(Query, (Answer) => {
			RL.close();
			Resolve(Answer);
		})
	);
}

async function getUser() {
	try {
		const user = await MTP.call('users.getFullUser', {
			id: {
				_: 'inputUserSelf'
			}
		});

		return user;
	} catch (error) {
		return null;
	}
}

function SendCode(phone) {
	return MTP.call('auth.sendCode', {
		phone_number: phone,
		settings: {
			_: 'codeSettings'
		}
	});
}

function SignIn({ code, phone, phone_code_hash }) {
	return MTP.call('auth.signIn', {
		phone_code: code,
		phone_number: phone,
		phone_code_hash: phone_code_hash
	});
}

function SignUp({ phone, phone_code_hash }) {
	return MTP.call('auth.signUp', {
		phone_number: phone,
		phone_code_hash: phone_code_hash,
		first_name: 'MTProto',
		last_name: 'Core'
	});
}

function GetPassword() {
	return MTP.call('account.getPassword');
}

function CheckPassword({ srp_id, A, M1 }) {
	return MTP.call('auth.checkPassword', {
		password: {
			_: 'inputCheckPasswordSRP',
			srp_id,
			A,
			M1
		}
	});
}

(async () => {
	const user = await getUser();

	const phone = phone_number;

	if (!user) {
		const { phone_code_hash } = await SendCode(phone);

		const code = await AskQuestion('Enter login code: ');

		try {
			const signInResult = await SignIn({
				code,
				phone,
				phone_code_hash
			});

			if (signInResult._ === 'auth.authorizationSignUpRequired') {
				await SignUp({
					phone,
					phone_code_hash
				});
			} else {
				console.log('[+] starting listener');

				var MTProto = MTP.mtprotoObject();
				MTProto.updates.on('updates', ({ updates }) => {
					const newChannelMessages = updates
						.filter((update) => update._ === 'updateNewChannelMessage')
						.map(({ message }) => message); // filter `updateNewChannelMessage` types only and extract the 'message' object
					for (const message of newChannelMessages) {
						// printing new channel messages
						console.log(`[${message.to_id.channel_id}] ${message.message}`);
					}
				});
			}
		} catch (error) {
			if (error.error_message !== 'SESSION_PASSWORD_NEEDED') {
				console.log(`error:`, error);

				return;
			}

			// 2FA

			const password = 'USER_PASSWORD';

			const { srp_id, current_algo, srp_B } = await GetPassword();
			const { g, p, salt1, salt2 } = current_algo;

			const { A, M1 } = await MTP.mtproto.crypto.getSRPParams({
				g,
				p,
				salt1,
				salt2,
				gB: srp_B,
				password
			});

			const CheckPasswordResult = await CheckPassword({ srp_id, A, M1 });
		}
	} else {
		console.log('[+] starting listener');

		var MTProto = MTP.mtprotoObject();
		MTProto.updates.on('updates', ({ updates }) => {
			const newChannelMessages = updates
				.filter((update) => update._ === 'updateNewChannelMessage')
				.map(({ message }) => message); // filter `updateNewChannelMessage` types only and extract the 'message' object

			for (const message of newChannelMessages) {
				// console.log(message, 'message');

				const CHExist = IsInMonitorChannels(message.peer_id.channel_id);

				console.log(CHExist, 'CHExist');

				if (CHExist.length) {
					var ChannelContent = JSON.parse(
						FS.readFileSync(`${__dirname}/../../storage/channel-data/${CHExist[0].name}.json`).toString(
							'utf8'
						)
					);

					console.log(message);
					console.log('==============================');

					var NewData = {
						_: 'Message',
						id: message.id,
						peer_id: {
							_: 'PeerChannel',
							channel_id: message.peer_id.channel_id
						},
						date: message.date,
						message: message.message,
						out: false,
						mentioned: false,
						media_unread: false,
						silent: false,
						post: true,
						from_scheduled: false,
						legacy: false,
						edit_hide: false,
						pinned: false,
						from_id: null,
						fwd_from: null,
						via_bot_id: null,
						reply_to: null,
						media: null,
						reply_markup: null,
						entities: [
							{
								_: 'MessageEntityHashtag',
								offset: 17,
								length: 4
							},
							{
								_: 'MessageEntityMention',
								offset: 192,
								length: 15
							}
						],
						views: 2,
						forwards: 0,
						replies: null,
						edit_date: null,
						post_author: null,
						grouped_id: null,
						restriction_reason: [],
						ttl_period: null
					};

					if (typeof message.reply_to != 'undefined') {
						NewData.reply_to = {};

						NewData.reply_to = message.reply_to;
					}

					ChannelContent.push(NewData);

					FS.writeFileSync(
						`${__dirname}/../../storage/channel-data/${CHExist[0].name}.json`,
						JSON.stringify(ChannelContent)
					);
				}

				// printing new channel messages
				// console.log(`[${message.peer_id.channel_id}] ${message.message}`);
			}
		});
	}
})();

// (async () => {
//     var MTProto = MTP.mtprotoObject();
//     const resolvedPeer = await MTProto.call('contacts.resolveUsername', {
//         username: 'exbforcesignal'
//     });

//     console.log(resolvedPeer.peer);

//     // const channel = resolvedPeer.chats.find((chat) => chat.id === resolvedPeer.peer.channel_id);

//     // const inputPeer = {
//     //     _: 'inputPeerChannel',
//     //     channel_id: channel.id,
//     //     access_hash: channel.access_hash
//     // };

//     // const LIMIT_COUNT = 10;
//     // const allMessages = [];

//     // const firstHistoryResult = await api.call('messages.getHistory', {
//     //     peer: inputPeer,
//     //     limit: LIMIT_COUNT
//     // });

//     // const historyCount = firstHistoryResult.count;

//     // for (let offset = 0; offset < historyCount; offset += LIMIT_COUNT) {
//     //     const history = await api.call('messages.getHistory', {
//     //         peer: inputPeer,
//     //         add_offset: offset,
//     //         limit: LIMIT_COUNT
//     //     });

//     //     allMessages.push(...history.messages);
//     // }

//     // console.log('allMessages:', allMessages);
// })().catch((ReturnError) => console.log(ReturnError));
