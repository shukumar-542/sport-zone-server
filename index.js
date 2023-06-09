const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  app.use(express.json())



  
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASS}@cluster0.66lxfzt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('sportZone').collection('users');
    const classCollection = client.db('sportZone').collection('allClass');
    
    // saved user email and role in database
    app.put('/users/:email', async(req, res)=>{
        const email  = req.params.email;
        const user = req.body;
        const query = {email :  email};
        const options = {upsert  : true}
        const updateDoc = {
            $set : user
        }
        const result = await userCollection.updateOne(query,updateDoc,options)
        console.log(result);
        res.send(result)

    })
    // get all Users 
    app.get('/users', async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // user to admin
    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)}
      const updateDoc = {
        $set :{ role : 'admin'}
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    // user to instructor
    app.patch('/users/instructor/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)}
      const updateDoc = {
        $set :{ role : 'instructor'}
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })


    // update class status
    app.patch('/classes/update/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const updateDoc= { 
        $set : {status : 'approved'}
      }
      const result = await classCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    // post all register classes
    app.post('/add-class', async(req,res)=>{
      const classData = req.body;
      console.log(classData);
      const result = await classCollection.insertOne(classData)
      res.send(result)
    })
    // get all classed
    app.get('/classes', async(req,res)=>{
      const result = await classCollection.find().toArray()
      res.send(result)
    })
    // show instructor class
    app.get('/classes/:email', async(req,res)=>{
      const email = req.params.email;
      const query = {email : email};
      const result = await classCollection.find(query).toArray()
      res.send(result)
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
    res.send('sportZone Server is running..')
  })
  
  app.listen(port, () => {
    console.log(`sportZone is running on port ${port}`)
  })