const express = require('express')
const app = express();
app.use(express.json());

const bbbb = []
function aaaa(cpf, vetor){
    const https = require('https');

    let url = `https://viacep.com.br/ws/${cpf}/json/`;

    https.get(url,(res) => {
        let body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        res.on("end", () => {
            
                let json = JSON.parse(body);
                vetor.push(json)
                
                console.log(vetor)
            
        });

    }).on("error", (error) => {
        console.error(error.message);
    });
}

aaaa(35045540, bbbb)

app.listen(3456)