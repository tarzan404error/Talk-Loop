// Chat application server
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store connected users
const users = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
	console.log('New client connected:', socket.id);

	// Handle login
	socket.on('login', (data) => {
		const user = {
			id: data.id,
			name: data.name,
			socketId: socket.id
		};
		
		users.set(data.id, user);
		socket.userId = data.id;
		
		// Send success confirmation
		socket.emit('loginSuccess', {
			id: data.id,
			name: data.name
		});
		
		// Broadcast user joined
		socket.broadcast.emit('userJoined', {
			userId: data.id,
			name: data.name,
			users: Array.from(users.values()).map(u => ({ id: u.id, name: u.name }))
		});
		
		// Send current users list to the new user
		socket.emit('usersList', Array.from(users.values()).map(u => ({ id: u.id, name: u.name })));
		
		console.log(`User ${data.name} (${data.id}) joined`);
	});

	// Handle messages
	socket.on('message', (data) => {
		// Broadcast message to all clients
		io.emit('message', {
			userId: data.userId,
			userName: data.userName,
			message: data.message,
			timestamp: data.timestamp || new Date()
		});
		
		console.log(`Message from ${data.userName}: ${data.message}`);
	});

	// Handle typing indicator
	socket.on('typing', (data) => {
		socket.broadcast.emit('typing', {
			userId: data.userId,
			userName: data.userName
		});
	});

	// Handle stop typing
	socket.on('stopTyping', () => {
		socket.broadcast.emit('stopTyping');
	});

	// Handle name update
	socket.on('updateName', (data) => {
		if (users.has(data.id)) {
			const user = users.get(data.id);
			const oldName = user.name;
			user.name = data.name;
			
			// Broadcast name update
			io.emit('nameUpdated', {
				userId: data.id,
				oldName: oldName,
				name: data.name,
				users: Array.from(users.values()).map(u => ({ id: u.id, name: u.name }))
			});
			
			console.log(`User ${data.id} changed name from ${oldName} to ${data.name}`);
		}
	});

	// Handle disconnect
	socket.on('disconnect', () => {
		if (socket.userId && users.has(socket.userId)) {
			const user = users.get(socket.userId);
			users.delete(socket.userId);
			
			// Broadcast user left
			io.emit('userLeft', {
				userId: socket.userId,
				name: user.name,
				users: Array.from(users.values()).map(u => ({ id: u.id, name: u.name }))
			});
			
			console.log(`User ${user.name} (${socket.userId}) left`);
		}
		console.log('Client disconnected:', socket.id);
	});
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Chat server running on http://localhost:${PORT}`);
});
