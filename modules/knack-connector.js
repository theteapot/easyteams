const rp = require('request-promise');

const storage = require('node-persist')

const applicationId = '568c51e7f1677ebd18d685f6'

module.exports = {
	authenticateUser: authenticateUser,
	getTaskList: getTaskList,
	storage: storage
}

function storeLocal(key, value) {
}

function authenticateUser(email, password) {
	return storage.get('email')
		.then(storedEmail => {
			if (email === storedEmail) {
				console.log('Found user in storage')
				return storage.get('token');
			} else {
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
						storage.set('email', email).then(data => console.log('wrote email to storage'));
						storage.set('token', auth.session.user.token).then(data => console.log('wrote token to storage'))
						return auth.session.user.token
					})
					.catch(err => {
						throw err
					})
			}
		})

}

function getTaskList(token) {
	return rp.get('https://api.knack.com/v1/pages/scene_1/views/view_16/records', {
		method: 'GET',
		headers: {
			'X-Knack-Application-Id' : applicationId,
			'X-Knack-REST-API-KEY' : 'knack',
			'Authorization' : token,
		},
		json: true
	})
	.then(res => {
		const tasks = []
		for (let record of res.records) {
			console.log(record)
			const task = {}
			task.knackId = record.id
			task.dueDate = record.field_4;
			task.taskId = record.field_286;
			task.description = record.field_50;
			task.project = record.field_109_raw[0].identifier;
			task.milestone = record.field_282_raw[0].identifier;
			task.budgetHours = record.field_275;
			task.actualHours = record.field_278;
			task.status = record.field_5
			tasks.push(task);
		}
		storage.set('tasks', tasks)
		return tasks;
	})
	.catch(err => {
		throw err;
	})
}

function putStartTime(token, taskId) {

}

//authenticateUser('taylor@easyforms.co.nz', 'chlbwvf1');
//getTaskList('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTk4N2VjMjc0YzcyNDA1ZTJmMGVkOGNlIiwiYXBwbGljYXRpb25faWQiOiI1NjhjNTFlN2YxNjc3ZWJkMThkNjg1ZjYiLCJpYXQiOjE1MDIwODAwNDV9._qbjfnrjMXK6bWZ3SrxfworGVNBfxmC3C2qx3lByakc')
//putStartTime('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTk4N2VjMjc0YzcyNDA1ZTJmMGVkOGNlIiwiYXBwbGljYXRpb25faWQiOiI1NjhjNTFlN2YxNjc3ZWJkMThkNjg1ZjYiLCJpYXQiOjE1MDIwODAwNDV9._qbjfnrjMXK6bWZ3SrxfworGVNBfxmC3C2qx3lByakc', )