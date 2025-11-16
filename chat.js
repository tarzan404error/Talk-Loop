// Chat application client-side code
const socket = io();

// DOM elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginIdInput = document.getElementById('loginIdInput');
const loginNameInput = document.getElementById('loginNameInput');
const app = document.getElementById('app');
const nameInput = document.getElementById('nameInput');
const usersList = document.getElementById('users');
const messagesDiv = document.getElementById('messages');
const typingDiv = document.getElementById('typing');
const sendForm = document.getElementById('sendForm');
const msgInput = document.getElementById('msgInput');

// State
let currentUser = {
	id: '',
	name: ''
};
let typingTimeout;
let isTyping = false;

// Login functionality
loginForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const userId = loginIdInput.value.trim();
	const userName = loginNameInput.value.trim();
	
	if (userId && userName) {
		currentUser.id = userId;
		currentUser.name = userName;
		
		// Emit login event
		socket.emit('login', {
			id: userId,
			name: userName
		});
		
		// Hide login modal and show app
		loginModal.style.display = 'none';
		app.style.display = 'flex';
		msgInput.focus();
	}
});

// Update display name
nameInput.addEventListener('change', () => {
	const newName = nameInput.value.trim();
	if (newName && newName !== currentUser.name) {
		socket.emit('updateName', {
			id: currentUser.id,
			name: newName
		});
		currentUser.name = newName;
	}
});

// Send message
sendForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const message = msgInput.value.trim();
	
	if (message) {
		socket.emit('message', {
			userId: currentUser.id,
			userName: currentUser.name,
			message: message,
			timestamp: new Date()
		});
		
		msgInput.value = '';
		socket.emit('stopTyping');
		isTyping = false;
	}
});

// Typing indicator
msgInput.addEventListener('input', () => {
	if (!isTyping) {
		isTyping = true;
		socket.emit('typing', {
			userId: currentUser.id,
			userName: currentUser.name
		});
	}
	
	clearTimeout(typingTimeout);
	typingTimeout = setTimeout(() => {
		socket.emit('stopTyping');
		isTyping = false;
	}, 1000);
});

// Socket event listeners
socket.on('connect', () => {
	console.log('Connected to server');
});

socket.on('disconnect', () => {
	console.log('Disconnected from server');
	showSystemMessage('Disconnected from server. Attempting to reconnect...');
});

socket.on('loginSuccess', (data) => {
	currentUser.id = data.id;
	nameInput.value = data.name;
	showSystemMessage(`Welcome, ${data.name}!`);
});

socket.on('userJoined', (data) => {
	showSystemMessage(`${data.name} joined the chat`);
	updateUsersList(data.users);
});

socket.on('userLeft', (data) => {
	showSystemMessage(`${data.name} left the chat`);
	updateUsersList(data.users);
});

socket.on('message', (data) => {
	addMessage(data, data.userId === currentUser.id);
});

socket.on('usersList', (users) => {
	updateUsersList(users);
});

socket.on('typing', (data) => {
	if (data.userId !== currentUser.id) {
		typingDiv.textContent = `${data.userName} is typing...`;
		typingDiv.style.display = 'block';
	}
});

socket.on('stopTyping', () => {
	typingDiv.style.display = 'none';
});

socket.on('nameUpdated', (data) => {
	updateUsersList(data.users);
	if (data.userId === currentUser.id) {
		currentUser.name = data.name;
		nameInput.value = data.name;
	}
});

// Helper functions
function addMessage(data, isOwn) {
	const messageDiv = document.createElement('div');
	messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
	
	const time = new Date(data.timestamp).toLocaleTimeString([], { 
		hour: '2-digit', 
		minute: '2-digit' 
	});
	
	messageDiv.innerHTML = `
		<div class="message-header">${escapeHtml(data.userName)}</div>
		<div class="message-content">${escapeHtml(data.message)}</div>
		<div class="message-time">${time}</div>
	`;
	
	messagesDiv.appendChild(messageDiv);
	messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showSystemMessage(message) {
	const messageDiv = document.createElement('div');
	messageDiv.className = 'message system';
	messageDiv.style.cssText = `
		align-self: center;
		background: #ecf0f1;
		color: #7f8c8d;
		font-style: italic;
		font-size: 0.9rem;
		padding: 0.5rem 1rem;
		border-radius: 12px;
	`;
	messageDiv.textContent = message;
	messagesDiv.appendChild(messageDiv);
	messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUsersList(users) {
	usersList.innerHTML = '';
	users.forEach(user => {
		const li = document.createElement('li');
		li.textContent = user.name;
		usersList.appendChild(li);
	});
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Auto-scroll to bottom on load
window.addEventListener('load', () => {
	messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
