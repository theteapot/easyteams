#!/usr/bin/env node
const ezt = require('commander');
const chalk = require('chalk');
const knack = require('./modules/knack-connector.js');
const prompt = require('prompt');

/*
Uses:
	-l Get list of tasks
		Might select a task
			Show details about selected task
			Ability to start/stop selected task
				(starting/stopping should automatically affect another task)

	-s Submit time on task
		Will also submit notes specified after flag

	See what everyone else is on

*/

function main() {
	prompt.start();
	authenticateUser();
}

function authenticateUser() {
	const schema = {
		properties: {
			email: {
				description: 'Email',
				pattern: /\w*(\@easyforms\.co\.nz)/,
				message: 'Must be a valid easyforms email',
				required: true
			},
			password: {
				description: 'Password',
				hidden: true
			}
		}
	}
	prompt.get(schema, (err, result) => {
		console.log(`Authenticating as ${chalk.bold.cyan(result.email)}`)		
		knack.authenticateUser(result.email, result.password)
		.then(res => {
			if (res.session.user.approval_status === 'approved') {
				console.log(chalk.black.bgGreen('Authentication successful'))
			} else {
				console.log(chalk.black.bgYellow('Unknown response:'), res)
			}
		})
		.catch(err => {
			console.log(chalk.bgRed(err.message));
			authenticateUser();
		})
	})
}

main();