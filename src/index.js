const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fetch = require('node-fetch')

const app = express();
app.use(express.json());

const customers = [];

//verifica se uma conta existe 
//e caso ele não existe 
//retorna: usuario não encontrado
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({
      error: "Customer not found",
    });
  }
  request.customer = customer;

  return next();
}

//calcula o saldo da conta
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

//verifica se uma conta existe
//e caso ele existe
//retorna: usuario ja existente
function customerAlreadyExists(request, response, next){
    const { cpf } = request.headers
    const customerAlreadyExist = customers.some(
        (customer) => customer.cpf === mascaraCpf(cpf)
    );
    
    if (customerAlreadyExist) {
        return response.status(400).json({
        error: "Customer already exists",
        });
    }
    //request.cpf = cpf
    return next()
}

//poe uma mascara no cpf: ex. ***.***.***-**
function mascaraCpf(cpfCm){
    const cpf = cpfCm.substring(0,3) + "." + cpfCm.substring(3,6) + "." + cpfCm.substring(6,9) + "-" + cpfCm.substring(9,11)
    return cpf
}

//verifica se o cpf é valido
function cpfValido(request, response, next){
    const { cpf } = request.headers
    if(cpf.length != 11){
        return response.status(400).json({
            error: "Invalid CPF"
        })
    }
    request.cpf = mascaraCpf(cpf)
    return next()
}
//criar conta
app.post("/account", cpfValido, customerAlreadyExists, (request, response) => {
    const { name } = request.body;
    const { cpf } = request;
    
    const customer = {
      cpf,
      name,
      id: uuidv4(),
      statement: [],
      enderecos: []
    };
  
    //acresenta em customers
    customers.push(customer);
  
    return response.status(201).send();
});
//retora o statement do usuario
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

app.get("/teste", (request, response) => {
  const a = customers;
  return response.json(a);
});

//deposita dinheiro na conta
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

//retira dinheiro da conta
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;
  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({
      error: "Insuficient funds",
    });
  }
  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

//busca o statement atraves da data
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

//alterar nome de uma conta
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;
  customer.name = name;
  return response.status(204).send();
});

//remover uma conta
app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const index = customers.indexOf(customer)
  customers.splice(index, 1);
  return response.status(200).json(customer);
});

//retornar o saldo de uma conta
app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);
  return response.json(balance);
});

app.get("/endereco/:cep",(request,response)=>{
  const {cep} = request.params;
  const url = `https://viacep.com.br/ws/${cep}/json/`;
  //instale o pacote (npm install node-fetch@2)
//faca o require no inicio do codigo: const fetch = require('node-fetch');    
  fetch(url).then((res) => res.json()).then(function(data){
      const endereco =
          {
              cep: data.cep,
              logradouro: data.logradouro,
              bairro: data.bairro,
              localidade: data.localidade,
              uf: data.uf
          }
        return response.status(200).json(endereco);
      })
    .catch(function(error) {
      console.log(error);
    })
});

app.post("/endereco/:cep",verifyIfExistsAccountCPF,(request,response)=>{
  const {customer} = request;
  const {cep} = request.params;
  const url = `https://viacep.com.br/ws/${cep}/json/`;  
 
  fetch(url).then((res) => res.json()).then(function(data){
      const endereco =
          {
              cep: data.cep,
              logradouro: data.logradouro,
              bairro: data.bairro,
              localidade: data.localidade,
              uf: data.uf
          }
        customer.enderecos.push(endereco);
        return response.status(200).json();
      })
    .catch(function(error) {
      console.log(error);
    })
});

app.delete("/endereco", verifyIfExistsAccountCPF,(request, response) => {
  const { customer } = request;
  const {cep} = request.query;

  const index = customers.indexOf(customer)
  console.log(index, "index")
  const endereco = customers[index].enderecos
  console.log(endereco)
  //endereco.splice()
  for(let i = 0; i < endereco.length; i++){
    if(endereco.cep[i].contains(cep)){
      endereco.splice(i, 1)
    }
  }
  
  return response.status(200).json(customer);
})

app.listen(3333);