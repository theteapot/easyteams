#!/usr/bin/env node
const ezt = require('commander');
const chalk = require('chalk');
const prompt = require('prompt');
const uniTable = require('cli-table2')
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
		knack.storage.clear()
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

	.parse(process.argv)

/* SELECT A USERS TASK */


/* MAIN PROCESS */
function main() {
	prompt.start();
	console.log('Authenticating...')
	Promise.all([knack.storage.get('email'), knack.storage.get('token')])
		.then(values => {
			if (typeof values[0] !== 'undefined' && typeof values[1] !== 'undefined') {
				console.log(`Found stored user : ${chalk.cyan(values[0])}`)
				console.log(`Found stored token: ${chalk.gray(values[1].slice(0, 20) + '...')}`)

				knack.getTaskList(values[1]).then(tasks => {
					displayTaskTable(tasks);
				})
			} else {
				authenticateUser();
			}
		})

}

function selectTask() {
	// Check if there is a stored list of tasks
	knack.storage.get('tasks').then(tasks => {
		console.log(tasks)
		if (tasks) {
			displayTaskTable(tasks)
			// Prompt the user to choose a task
			inquirer.prompt([{
				name: 'id',
				message: 'Select id: '
			}]).then(answers => {
				const selectedTask = tasks[answers.id];
				console.log(chalk.magenta('Selected task:'),selectedTask.taskId, selectedTask.description);
				knack.storage.set('selectedTask', selectedTask);		

				// If that task has no timesheet array, create it
				knack.storage.getItem(selectedTask.taskId).then(times => {
					if (!times) {
						knack.storage.setItem(selectedTask.taskId, [])
					}
				})
			})
		} else {
			console.log(chalk.yellow('Could not find stored tasks'))
		}
	})	
}

function manageTask() {
	knack.storage.getItem('selectedTask').then(selectedTask => {
		if (!selectedTask) {
			console.log('No task to manage');
			return
		}
		// Retrieving necessary pieces from local storage
		Promise.all([knack.storage.getItem('taskStatus'), knack.storage.getItem('token')])
		.then(values => {
			const taskStatus = values[0];
			const token = values[1];

			console.log(taskStatus ? `Stopping ${selectedTask.taskId}` : `Starting ${selectedTask.taskId}`)

			// Toggle the status of the task
			knack.storage.setItem('taskStatus', !taskStatus);

			// Update the times associated with the task
			knack.storage.getItem(selectedTask.taskId).then(times => {
				// Print out previous times
				console.log(chalk.cyan('Previous Times:'))
				for (let time of times) {
					console.log(`${moment(time.start).format('D/M h:mm')} - ${moment(time.end).format('D/M h:mm')} : ${time.description}`);
				}

				// If starting, create new entry in task array with start time
				if (!taskStatus) {
					// Create time object
					const time = {taskId: selectedTask.taskId, taskKnackId: selectedTask.knackId, start: new Date().getTime()}

					// Update local storage
					times.push(time);
					knack.storage.setItem(selectedTask.taskId, times);

					// Update knack database
					knack.updateTask(token, selectedTask.knackId, 'In Progress')
					.then(res => {
						if (res.record.field_5 === 'In Progress') {
							console.log(chalk.green('Successfully started'), selectedTask.taskId);
						}
					});

				} 

				// If stopping, append to time array
				if (taskStatus) {
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
						// Update time object
						const time = times.pop();
						time.end = new Date().getTime();
						time.description = answers.description;

						// Update local storage
						times.push(time)
						knack.storage.setItem(selectedTask.taskId, times)

						// Update knack db
						knack.updateTask(token, selectedTask.knackId, answers.complete ? 'Completed' : 'Pending')
						.then(res => {
							if (res.record.field_5 === answers.complete ? 'Completed' : 'Pending') {
								console.log(chalk.green('Successfully stopped'), selectedTask.taskId);
							}
						})
					})
				}	
			})
		})
	})
}

function displayTaskTable(tasks) {
	const table = new uniTable({
		head: ['id', 'Due', 'Task', 'Desc', 'Proj', 'Mile', 'bHrs', 'aHrs', 'Status', 'Knack'],
		colWidths: [4, 12, 6, 40, 30, 20, 7, 7, 10, 10],
	})
	for (let task of tasks) {
		table.push(colorTask(tasks.indexOf(task), task))
	}
	console.log(table.toString());
}

function userTasks(token) {
	console.log('Getting user tasks...')
	const table = new uniTable({
		head: ['', 'Due', 'Task', 'Desc', 'Proj', 'Mile', 'bHrs', 'aHrs', 'Status'],
		colWidths: [4, 12, 6, 40, 30, 20, 7, 7, 10]
	})
	knack.getTaskList(token).then(tasks => {
		for (let task of tasks) {
			table.push(colorTask(tasks.indexOf(task), task))
		}
	})
	return table;
}

function colorTask(index, task) {
	const taskArray = [index]
	for (let prop of Object.keys(task)) {

		taskArray.push(task[prop].trim())
	}
	return taskArray

}

function promptUserTask(tasks) {
	console.log(tasks);
	prompt.start()
	prompt.get(['index'], (err, result) => {

	})
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
			.then(token => {
				console.log(chalk.black.bgGreen('Authentication successful'));
				userTasks(token)
			})
			.catch(err => {
				console.log(chalk.bgRed(err.message));
				authenticateUser();
			})
	})
}
