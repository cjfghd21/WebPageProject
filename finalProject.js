
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const portNumber = process.env.PORT ||5000;
require("dotenv").config({ path: path.resolve(__dirname, 'MongoCredential/.env') })

const apiURL = process.env.NASA_API_URL;
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const databaseAndCollection = {db: database, collection: collection};

const { MongoClient, ServerApiVersion} = require('mongodb');
const app = express();

app.set("views", path.resolve(__dirname, "template"));
app.use(express.static(__dirname + '/template'));
app.use(express.static(__dirname));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

const uri = `mongodb+srv://${userName}:${password}@cluster0.nlskfoi.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get("/",(request, response)=>{
    const variables ={port : portNumber};
    console.log(variables);
    response.render("index",variables);
});

app.get("/photo",(request,response)=>{
    const variables ={port : portNumber};
    console.log("photo get");
    response.render("search",variables);
});

app.post("/photo",async(request,response)=>{
    console.log("photo post");
    try {
        console.log("this ran");
        await client.connect();   
        let date = "&date=" + request.body.ymd;
        const res = await fetch(apiURL+date);
        const data = await res.json();
        console.log(data);
        if(data.media_type =="image"){ //image exists on this date.
            await insertData(client, databaseAndCollection, data);
            const variables ={title : data.title,
                              source: data.url,
                              explanation:data.explanation,
                              port:portNumber
                              };
            response.render("image",variables);
        }else{
            const variables ={title : "Not Found",
                source: "Not Found",
                explanation:"Not Found",
                port:portNumber,
                };
            response.render("image",variables);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});


app.get("/history",async(request,response)=>{
    try {
        await client.connect();
        let result = await filterNotFound(client, databaseAndCollection, "Not Found");
        console.log(result);
        if(result.length !== 0){
            let table = `<table id="resultTable" border='1'>\n\t<tr>\n\t\t<th>Title</th>\n\t\t<th>Link</th>\n\t</tr>`
            Object.keys(result).forEach(i=>{
                let title = result[i].title;
                let link = result[i].url;
                table += `\n\t<tr>\n\t\t<td>${title}</td>`;
                table += `\n\t\t<td><a href=${link}>${link}</a></td>\n\t</tr>`;
            });
            table+=`</table>`;
            let varaibles={resultTable: table};
            response.render("history", varaibles);
        }else{
            let variables={resultTable: "No History"};
            response.render("history",variables);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});


app.get("/clear",(request,response)=>{
    const variables ={port : portNumber};
    console.log(variables);
    response.render("clear",variables);
})

app.post("/clear",async(request,response)=>{
    try {
        const variables ={port : portNumber};
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        response.redirect("/");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});


app.listen(portNumber, (err)=>{
    if(err){
        console.log("Starting server failed");
    }else{
        console.log(`Web server is running at: http://localhost:${portNumber}`);
    }
});




async function insertData(client, databaseAndCollection, newPhoto) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newPhoto);
}

async function filterNotFound(client, databaseAndCollection, NotFound) {
    let filter = {title : { $ne: NotFound}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);

    const result = await cursor.toArray();
    return result;
}
