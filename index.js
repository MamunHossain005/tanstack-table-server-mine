const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000

//builtin middleware
app.use(cors());
app.use(express.json());

//mongodb
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.meaaj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//convert string to object
function convertStringToObject(str){
  const obj = {};
  const propertyArray = str.split(',');

  for(let property of propertyArray){
    const [key, value] = property.split(':');
    obj[key] = isNaN(value) ? value : Number(value);
  }

  return obj;
}

//convert string number to number
function convertStringNumberToNumber(obj){
  if(typeof obj !== 'object' || obj === null){
    throw new Error('Input must be valid object');
  }

  for(let key in obj){
    if(typeof obj[key] === 'string' && !isNaN(obj[key])){
      obj[key] = Number(obj[key]);
    }
  }

  return obj;
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("userCollection");
    const users = database.collection("users");

    //users related apis
    app.get('/users', async(req, res) => {
      //sorting
        // let result;
        // if(req.query.sort){
        //   const [sortField, sortBy] = req.query.sort.split(':');
        //   const cursor = users.find().sort({[sortField]: sortBy});
        //   result = await cursor.toArray();
        //   res.send(result);
        // }
        // else {
        //   result = await users.find().toArray();
        //   res.send(result);
        // }
      //pagination
      const totalCount = await users.estimatedDocumentCount();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const total = await users.estimatedDocumentCount();
      const pagination = {};

      if(endIndex < total){
        pagination.next = {
          page: page + 1,
          limit
        }
      }

      if(startIndex > 0){
        pagination.prev = {
          page: page - 1,
          limit
        }
      }

      let result;
      if(req.query.search){
        const newUsers = users.find({
          $and: Object.entries(
            convertStringNumberToNumber(convertStringToObject(req.query.search))).map(([name, value]) => {
              return {
                [name]: typeof value === 'number' ? value : new RegExp(value, 'i'),
              }
            })
        })
        const searchUsers = newUsers.skip(startIndex).limit(limit);
        
        if(req.query.sort){
            const [sortField, sortBy] = req.query.sort.split(':');
            const cursor = searchUsers.sort({[sortField]: sortBy});
            result = await cursor.toArray();
        }
        else {
          delete req.query['sort'];
          result = await searchUsers.toArray();
        }
      }
      else {
        delete req.query['search'];
        const remainingUsers = users.find().skip(startIndex).limit(limit);
        if(req.query.sort){
            const [sortField, sortBy] = req.query.sort.split(':');
            const cursor = remainingUsers.sort({[sortField]: sortBy});
            result = await cursor.toArray();
        }
        else {
          delete req.query['sort'];
          result = await remainingUsers.toArray();
        }
      }
  
      res.send({
        count: limit,
        totalCount,
        pagination,
        data: result,
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Tanstack table data is loading');
});

app.listen(port, () => {
    console.log(`Tanstack table server is running on server: ${port}`);
})