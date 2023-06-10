const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;


// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })

    }
    req.decoded = decoded
    next()
  })

}




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
    const bookedClassCollection = client.db('sportZone').collection('bookedClass');
    const paymentBookingCollection = client.db('sportZone').collection('payment');


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // saved user email and role in database
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true }
      const updateDoc = {
        $set: user
      }
      const result = await userCollection.updateOne(query, updateDoc, options)
      console.log(result);
      res.send(result)

    })
    // booking class collection
    app.post('/booking', async (req, res) => {
      const item = req.body;
      const result = await bookedClassCollection.insertOne(item);
      res.send(result)
    })
    //get  booking collection by email 
    app.get('/booking', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await bookedClassCollection.find(query).toArray()
      res.send(result)
    })
    // delete booked class
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookedClassCollection.deleteOne(query)
      res.send(result);
    })

    // get all payment class by email
    app.get('/payment/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentBookingCollection.find(query).toArray();
      res.send(result)
    })

    // get all Users 
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    // get user role
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result)
    })

    // user to admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { role: 'admin' }
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    // check admin
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" }
      res.send(result)
    })

    // user to instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { role: 'instructor' }
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })


    // update class status
    app.patch('/classes/update/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'approved' }
      }
      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.patch('/classes/deny/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'deny' }
      }
      const result = await classCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // // deny classes feedback
    app.patch('/classes/feedback/:id', async (req, res) => {
      const id = req.params.id;
      const feedback = req.body
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback
        }
      }
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result)

    })

    // post all register classes
    app.post('/add-class', async (req, res) => {
      const classData = req.body;
      console.log(classData);
      const result = await classCollection.insertOne(classData)
      res.send(result)
    })
    // get all classed
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })
    // show instructor class
    app.get('/classes/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray()
      res.send(result)
    })


    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      if (price) {
        const amount = parseFloat(price) * 100;
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ['card'],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }


    });


    // saved booking info into database
    app.post('/paymentBookings', async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const result = await paymentBookingCollection.insertOne(booking);
      const query = { _id: new ObjectId(booking._id) }
      const reduceQuery = { _id: new ObjectId(booking.classId) }
      const deleteResult = await bookedClassCollection.deleteOne(query)
      const reduceSeat = await classCollection.findOne(reduceQuery);
      const newSeat = reduceSeat.seat - 1;
      // console.log(newSeat);
      const updateClassSeat = {
        $set: { seat: newSeat }
      }
      const availableSeat = await classCollection.updateOne(reduceQuery,updateClassSeat)
      res.send({ result, deleteResult ,availableSeat })
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