const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')
const port = process.env.PORT || 5000


app.use(express.json());
app.use(cors());




const uri = `mongodb+srv://${process.env.S3_BRACKET}:${process.env.S3_PASS}@cluster0.rowi9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function sendAppointmentEmail(booking) {
  const { patient, patientName, treatment, date, slot } = booking;

  var email = {
    from: process.env.EMAIL_SENDER,
    to: patient,
    subject: `Your Appointment for ${treatment} is on ${date} at ${slot} is Confirmed`,
    text: `Your Appointment for ${treatment} is on ${date} at ${slot} is Confirmed`,
    html: `
      <div>
        <p> Hello ${patientName}, </p>
        <h3>Your Appointment for ${treatment} is confirmed</h3>
        <p>Looking forward to seeing you on ${date} at ${slot}.</p>
        
        <h3>Our Address</h3>
        <p>Andor Killa Bandorban</p>
        <p>Bangladesh</p>
        <a href="https://web.programming-hero.com/">unsubscribe</a>
      </div>
    `
  };

}



// }

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });

}
async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('doctor').collection('services');
    
    const userCollection = client.db('doctor').collection('users');
    
    const servicesCollection = client.db('manu').collection('inventory');
    const bookingsCollection = client.db('manu').collection('book');
    const reviewCollection = client.db('manu').collection('review');
    //Api Naming conversion

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

 
    app.get('/inventory', async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const inventoryes = await cursor.toArray();
      res.send(inventoryes);
    });
    app.post('/inventory',  async (req, res) => {
      const newServices = req.body;
      const result = await servicesCollection.insertOne(newServices);
      res.send(result);
    });
   
    app.post('/review', async (req, res) => {
      const newService = req.body;
      const result = await reviewCollection.insertOne(newService);
      res.send(result);
  });
    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    app.get('/inventory/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const inventory = await servicesCollection.findOne(query);
      res.send(inventory);
    });
    app.delete('/inventory/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const inventory = await servicesCollection.findOne(query);
      res.send(inventory);
    });
    app.delete('/inventory/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await servicesCollection.deleteOne(filter);
      res.send(result);
    })
    app.post('/book', async (req, res) => {
      const newService = req.body;
      const result = await bookingsCollection.insertOne(newService);
      res.send(result);
    });
  
  


    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query).project({ name: 1 });
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/user',  async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      //body nicci na karon seta thakbe
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    });

  

    
    app.get('/book/:email',  async (req, res) => {
      const email = req.params.email;
      const user = await bookingsCollection.findOne({ email: email });
      
      res.send(user);
    })

    


   

   
  }
  finally {

  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello From Doctor Uncle own portal!')
})

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`)
})