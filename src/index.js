const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

//verifica se usuario existe
function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  //busca do usuario
  const user = users.find(user => user.username === username);
  
  if(!user) return response.status(404).json({ error:"User doesn't exist!"})

  request.user = user;

  next();
}

//verifica se usuário com plano free atingiu o limite de todos
function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  //se o usuario não possui plano pro e já possui 10 todos cadastrados
  if(!user.pro && user.todos.length === 10) return response.status(403).json({ error:"Your have exceeded your limit of todos"});

  next();
}

//verificação se o todo existe
function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  //busca do usuario
  const user = users.find(user => user.username === username);

  //usuario não encontrado
  if(!user) return response.status(404).json({ error:"User not found!"});

  //validação do uuid
  if(!validate(id)) return response.status(400).json({ error:"Id is not a valid uuid!"});

  //busca do todo
  const todo = user.todos.find(user => user.id === id);

  //todo não encontrado
  if(!todo) return response.status(404).json({ error: "Todo not found!"})

  //retorna user e todo na request
  request.user = user;
  request.todo = todo;

  next();
}

//busca de usuario via id
function findUserById(request, response, next) {  
  const { id } = request.params;    

  //validação do id
  if(!validate(id)) return response.status(404).json({ error:"Id is not a valid uuid!"});

  //busca do usuario
  const user = users.find(user => user.id === id);

  //usuario não encontrado
  if(!user) return response.status(404).json({ error: "User not found!"})

  //retorna user na request
  request.user = user;  

  next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};