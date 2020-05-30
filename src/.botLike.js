﻿const Client = require('instagram-private-api').V1;
const delay = require('delay');
const chalk = require('chalk');
const _ = require('lodash');
const rp = require('request-promise');
const S = require('string');
const inquirer = require('inquirer');

const User = [
{
	type:'input',
	name:'username',
	message:'[>] Insert Username:',
	validate: function(value){
		if(!value) return 'Can\'t Empty';
		return true;
	}
},
{
	type:'password',
	name:'password',
	message:'[>] Insert Password:',
	mask:'*',
	validate: function(value){
		if(!value) return 'Can\'t Empty';
		return true;
	}
},
{
  type:'input',
  name:'target',
  message:'[>] Insert Username Target (Without @[at]):',
  validate: function(value){
    if(!value) return 'Can\'t Empty';
    return true;
  }
},
{
  type:'input',
  name:'mediasPerDelay',
  message:'[>] Number of Medias per Delay:',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Use Number Only!';
  }
},
{
  type:'input',
  name:'sleep',
  message:'[>] Insert Delay (MiliSeconds):',
  validate: function(value){
    value = value.match(/[0-9]/);
    if (value) return true;
    return 'Delay is number';
  }
}
]

const Login = async function(User){

	const Device = new Client.Device(User.username);
	const Storage = new Client.CookieMemoryStorage();
	const session = new Client.Session(Device, Storage);

	try {
		await Client.Session.create(Device, Storage, User.username, User.password)
		const account = await session.getAccount();
		return Promise.resolve({session,account});
	} catch (err) {
		return Promise.reject(err);
	}

}
const Target = async function(username){
  const url = 'https://www.instagram.com/'+username+'/'
  const option = {
    url: url,
    method: 'GET'
  }
  try{
    const account = await rp(option);
    const data = S(account).between('<script type="text/javascript">window._sharedData = ', ';</script>').s
    const json = JSON.parse(data);
    if (json.entry_data.ProfilePage[0].graphql.user.is_private) {
      return Promise.reject('Target is private Account');
    } else {
      const id = json.entry_data.ProfilePage[0].graphql.user.id;
      const followers = json.entry_data.ProfilePage[0].graphql.user.edge_followed_by.count;
      return Promise.resolve({id,followers});
    }
  } catch (err){
    return Promise.reject(err);
  }

}

const Media = async function(session, id){
	const Media = new Client.Feed.UserMedia(session, id);

	try {
		const Poto = [];
		var cursor;
			if (cursor) Media.setCursor(cursor);
			const getPoto = await Media.get();
			await Promise.all(getPoto.map(async(poto) => {
				Poto.push({
					id:poto.id,
					link:poto.params.webLink
				});
			}))
			cursor = await Media.getCursor()
		return Promise.resolve(Poto);
	} catch (err){
		return Promise.reject(err);
	}
}

async function ngeLike(session, id){
	try{
		await Client.Like.create(session, id)
		return true;
	} catch(e) {
		return false;
	}
}

const Excute = async function(User, TargetUsername, mediasPerDelay, sleep){
	try {
		/** TRY TO LOGIN **/
		console.log('\n');
		console.log('[?] Try to Login . . .');
		const doLogin = await Login(User);
		console.log(chalk`{bold.green [!] Login Succsess!}`);

		/** TRY TO GET ALL MEDIA **/	
		console.log('[?] Try to get Media . . .')		
		const getTarget = await Target(TargetUsername);
		var getMedia = await Media(doLogin.session, getTarget.id);
		console.log(chalk`{bold.green [!] Succsess to get Media From [${TargetUsername}] }\n`);
		getMedia = _.chunk(getMedia, mediasPerDelay);

		/** TRY TO DELETE ALL MEDIA **/
		for (let i = 0; i < getMedia.length; i++) {
			await Promise.all(getMedia[i].map(async(media) => {
				const doLike = await ngeLike(doLogin.session, media.id);
				const PrintOut = chalk`> ${media.link} => ${doLike ? chalk`{bold.green Success}` : chalk`{bold.red Failed}`}`
				console.log(PrintOut);
			}))
			console.log(chalk`{yellow \n [#][>][{cyan Account: ${User.username}}][{cyan Target: ${TargetUsername}}] Delay For ${sleep} MiliSeconds [<][#] \n}`)
			await delay(sleep)
		}
    	console.log(chalk`{bold.green [+] Bom Like Post Succeed}`)
	} catch (err) {
		console.log(err);
	}
}
console.log(chalk`
  {bold.yellow
  ===================  [CIPHER BOT]  ===================
  
  [>] {bold.green Target's Post Auto Liker}
  
  ===================  [THANKS TO]  ===================
  |      CIPHER INSTAGRAM BOT v3.2                    |
  |  {bold.green "KHALID SHA"} [The CipherX]- The Author           |
  |        @the_khalid_sha [INSTAGRAM]                |
  | git clone https://github.com/TheCipherX/cipherbot | } 
`);
//ikiganteng
inquirer.prompt(User)
.then(answers => {
	Excute({
		username:answers.username,
		password:answers.password
	},answers.target,answers.mediasPerDelay,answers.sleep);
})
