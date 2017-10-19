#!/usr/bin/env node
const ezt = require('commander');
const chalk = require('chalk');
const prompt = require('prompt');
const uniTable = require('cli-table2');
const inquirer = require('inquirer');
const moment = require('moment');

const knack = require('./modules/knack-connector.js');

knack.storage.initSync({
	dir: require('os').homedir() + '/.node/ezt/.node-persist/storage',
	stringify: JSON.stringify,
	parse: JSON.parse
});

/* PROCESS ARGUMENTS */
ezt
	.option('-d', 'clears the storage of cached user and token', () => {
		knack.storage.clear();
	})
	.option('-s', 'Prompts for a task selection', () => {
		selectTask();
	})
	.option('-r', 'executes the main loop', () => {
		main();
	})
	.option('-g', 'Handle starting and stopping of the task', () => {
		manageTask();
	})
	.option('-l', 'Get, list, and store tasks', () => {
		userTasks();
	})

	.parse(process.argv);

/* SELECT A USERS TASK */


/* MAIN PROCESS */
function main() {
	prompt.start();
	console.log('Authenticating...')
	knack.storage.getItem('user').then(user => {
		if (!user) {
			authenticateUser();
		} else {
			console.log(`Found stored user : ${chalk.cyan(user.identifier[0])} - ${user.id}`)
			console.log(`Found stored token: ${chalk.gray(user.token[1])}`)

			knack.getTaskList(user.token).then(tasks => {
				displayTaskTable(tasks);
			})
		}
	})

}

function selectTask() {
	knack.storage.getItem('selectedTask').then(selectedTask => {
		if (selectedTask) {
			inquirer.prompt([{
				name: 'unselect',
				type: 'confirm',
				message: chalk.blue(selectedTask.field_286) + ' already selected, ' + chalk.red('unselect?')
			}]).then(answers => {
				if (answers.unselect && selectedTask.field_5 === 'In Progress') {
					console.log(chalk.bgRed('Warning:', 'you already have an in progress task, please stop it before selecting a new one'));
					return;
				} else if (answers.unselect) {
					knack.storage.setItem('selectedTask', null)
					knack.storage.get('tasks').then(tasks => {
						if (tasks) {
							displayTaskTable(tasks);
							// Prompt the user to choose a task
							inquirer.prompt([{
								name: 'id',
								message: 'Select id: '
							}]).then(answers => {
								const selectedTask = tasks[answers.id];
								console.log(chalk.magenta('Selected task:'), selectedTask.field_286, selectedTask.field_50);
								knack.storage.set('selectedTask', selectedTask).then( () => {
									manageTask()
								});
				
								
							});
						} else {
							console.log(chalk.yellow('Could not find stored tasks'));
						}
					});
				} else {
					return
				}
			})
		}
	})
	// Check if there is a stored list of tasks
	
}

function manageTask() {
	knack.storage.getItem('selectedTask').then(selectedTask => {
		if (!selectedTask) {
			console.log('No task to manage');
			return;
		}
		// Retrieving necessary pieces from local storage
		knack.storage.getItem('user').then(user => {
			const taskStatus = selectedTask.field_5;
			// STARTING TASK: If starting, create new entry in task array with start time
			if (taskStatus !== 'In Progress') {
				console.log(chalk.green('Starting task'), selectedTask.field_286)
				knack.storage.setItem('selectedTask', Object.assign(selectedTask, { field_5: 'In Progress' }));

				// Update knack database
				knack.updateTask(user.token, selectedTask.id, 'In Progress').then( res => {
					console.log('Updated task status to: ', chalk.green.bold('In Progress'))
				});
				knack.startTime(user.token, selectedTask.id, user.id, selectedTask.field_109,
					selectedTask.field_282, selectedTask.field, new Date())
					.then(res => {
						console.log('Time started: ', chalk.bold.magenta(moment().format('hh:mm')));
						knack.storage.setItem('selectedTask', Object.assign(selectedTask, { timeId: res.record.id }))
					})
					.catch(err => {
						console.log(err);
					})
			}

			// If stopping, append to time array
			if (taskStatus === 'In Progress') {
				console.log(chalk.blue('Stopping task:'), selectedTask.field_286)
				inquirer.prompt([{
					name: 'complete',
					type: 'confirm',
					message: 'Complete?'
				},
				{
					name: 'description',
					type: 'input',
					message: 'Description:'
				}]).then(answers => {
					knack.storage.setItem('selectedTask', Object.assign(selectedTask, { field_5: answers.complete ? 'Completed' : 'Pending' }))
					// Update knack db
					knack.updateTask(user.token, selectedTask.id, answers.complete ? 'Completed' : 'Pending')
						.then(res => {
							if (res.record.field_5 === answers.complete ? 'Completed' : 'Pending') {
								console.log('Updated task status to:', chalk.bold.red(answers.complete ? 'Completed' : 'Pending'));
							}
						});
					knack.stopTime(user.token, selectedTask.timeId, moment().add(12, 'hours').format('ddd MMM DD YYYY hh:mm:ss'), answers.description).then(res => {
						console.log('Time stopped: ', chalk.bold.yellow(moment().format('hh:mm')))
					})
				});
			}
		});
	});
};

function displayTaskTable(tasks) {
	const table = new uniTable({
		head: ['', 'Due', 'Task', 'Desc', 'bHrs', 'aHrs', 'Status'],
		colWidths: [3, 12, 6, 40, 7, 7, 15]
	});
	for (var i = 0; i < tasks.length; i++) {
		const task = tasks[i]
		const newTask = [
			i,
			task.field_4, 	// duedate
			task.field_286, // taskId
			task.field_50,	// description
			task.field_275,	// budgetHours
			task.field_278,	// actualHours
			task.field_5	// status
		]
		table.push(newTask)
	}
	console.log(table.toString())
}

function userTasks() {
	console.log('Getting user tasks...');
	knack.storage.getItem('user').then(user => {
		knack.getTaskList(user.token).then(tasks => {
			displayTaskTable(tasks);
		});
	})
}



function promptUserTask(tasks) {
	console.log(tasks);
	prompt.start();
	prompt.get(['index'], (err, result) => {

	})
}

function authenticateUser() {
	const schema = {
		properties: {
			email: {
				description: 'Email',
				pattern: /\w*(@easyforms\.co\.nz)/,
				message: 'Must be a valid easyforms email',
				required: true
			},
			password: {
				description: 'Password',
				hidden: true
			}
		}
	};
	prompt.get(schema, (err, result) => {
		console.log(`Authenticating as ${chalk.bold.cyan(result.email)}`);
		knack.authenticateUser(result.email, result.password)
			.then(token => {
				console.log(token);
				console.log(chalk.black.bgGreen('Authentication successful'));
			})
			.catch(err => {
				console.log(chalk.bgRed(err.message));
				authenticateUser();
			});
	});
}

