const rp = require('request-promise');

const storage = require('node-persist')

const applicationId = '568c51e7f1677ebd18d685f6'

module.exports = {
	authenticateUser: authenticateUser,
	getTaskList: getTaskList,
	storage: storage,
	updateTask: updateTask,
	startTime: startTime,
	stopTime: stopTime
}

function storeLocal(key, value) {
}

function authenticateUser(email, password) {
	return rp.post(`https://api.knack.com/v1/applications/${applicationId}/session`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: {
			email: email,
			password: password
		},
		json: true
	})
		.then(auth => {
			storage.set('user', {
				name: `${auth.session.user.values.name.first} ${auth.session.user.values.name.last}`,
				id: auth.session.user.id,
				token: auth.session.user.token
			}).then( () => console.log('Stored user'))
		})
		.catch(err => {
			throw err
		})
}

function getTaskList(token) {
	return rp.get('https://api.knack.com/v1/pages/scene_1/views/view_16/records', {
		method: 'GET',
		headers: {
			'X-Knack-Application-Id': applicationId,
			'X-Knack-REST-API-KEY': 'knack',
			'Authorization': token,
		},
		json: true
	})
		.then(res => {
			const tasks = []
			for (let record of res.records) {
				tasks.push(record)
			}
			storage.setItem('tasks', tasks)
			return tasks
			/*
			for (let record of res.records) {
				const task = {}
				console.log(record)
				task.dueDate = record.field_4;
				task.taskId = record.field_286;
				task.description = record.field_50;
				task.project = record.field_109.length === 0 ? '' : record.field_109_raw[0].identifier;
				task.milestone = record.field_109_raw.length === 0 ? '' : record.field_282_raw[0].identifier;
				task.budgetHours = record.field_275;
				task.actualHours = record.field_278;
				task.status = record.field_5
				task.knackId = record.id
				tasks.push(task);
			}
			storage.set('tasks', tasks)
			return tasks;*/
		})
		.catch(err => {
			throw err;
		})
}

function updateTask(token, knackId, status) {
	// Changes the status of the task
	return rp.put(`https://api.knack.com/v1/pages/scene_29/views/view_37/records/${knackId}`, {
		method: 'PUT',
		headers: {
			'X-Knack-Application-Id': applicationId,
			'X-Knack-REST-API-KEY': 'knack',
			'Authorization': token,
			'Content-Type': 'application/json'
		},
		body: {
			field_5: status
		},
		json: true
	})
}

function startTime(token, task, user, project, milestone) {
	return rp.post(`https://api.knack.com/v1/pages/scene_187/views/view_287/records`, {
		method: 'POST',
		headers: {
			'X-Knack-Application-Id': applicationId,
			'X-Knack-REST-API-KEY': 'knack',
			'Authorization': token,
			'Content-Type': 'application/json'
		},
		body: {
			field_269: user,
			field_276: task,
			field_336: milestone,
			field_268: project,
		},
		json: true
	})
}
<<<<<<< HEAD
=======

function stopTime(token, timeId, stop, description) {
	return rp.put(`https://api.knack.com/v1/pages/scene_187/views/view_287/records/${timeId}`, {
		method: 'PUT',
		headers: {
			'X-Knack-Application-Id': applicationId,
			'X-Knack-REST-API-KEY': 'knack',
			'Authorization': token,
			'Content-Type': 'application/json'
		},
		body: {
			field_349: stop,
			field_267: description
		},
		json: true
	});
}
//getTaskList('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTk4N2VjMjc0YzcyNDA1ZTJmMGVkOGNlIiwiYXBwbGljYXRpb25faWQiOiI1NjhjNTFlN2YxNjc3ZWJkMThkNjg1ZjYiLCJpYXQiOjE1MDIwODAwNDV9._qbjfnrjMXK6bWZ3SrxfworGVNBfxmC3C2qx3lByakc')
//putStartTime('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTk4N2VjMjc0YzcyNDA1ZTJmMGVkOGNlIiwiYXBwbGljYXRpb25faWQiOiI1NjhjNTFlN2YxNjc3ZWJkMThkNjg1ZjYiLCJpYXQiOjE1MDIwODAwNDV9._qbjfnrjMXK6bWZ3SrxfworGVNBfxmC3C2qx3lByakc', )
>>>>>>> 23a68463b170fd388976ec77a6237e246e72d4bc
