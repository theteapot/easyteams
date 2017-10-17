const rp = require('request-promise');
const storage = require('node-persist').init({
	dir: require('os').homedir() + '/.node/ezt/data/'
});

const applicationId = '568c51e7f1677ebd18d685f6'

module.exports = {
	storeLocal: storeLocal,
	authenticateUser: authenticateUser
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
		storage.set('user', email);
		storage.set('token', auth.session.user.token)
		return auth
	})
	.catch(err => {
		throw err
	})
}

function getTaskList() {
	return rp.get()
}

//authenticateUser('taylor@easyforms.co.nz', 'chlbwvf1');

