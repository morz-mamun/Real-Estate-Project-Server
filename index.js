const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//mongodb code

const uri = process.env.DB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("MorzeDB").collection("users");
    const allPropertyCollection = client
      .db("MorzeDB")
      .collection("allProperty");
    const wishPropertyCollection = client
      .db("MorzeDB")
      .collection("wishProperties");
    const offeredPropertyCollection = client
      .db("MorzeDB")
      .collection("offeredProperties");
    const reviewCollection = client.db("MorzeDB").collection("reviews");

    // jwt related API ->
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

    // middleware

    // verify token
    const verifyToken = async (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access" });
      }

      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send("Unauthorized Access");
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin after verify token

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(401).send("Unauthorized Access");
      }
      next();
    };

    // review related API ->
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { reviewerEmail: email };
      const result = await reviewCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(filter);
      res.send(result);
    });

    // wishlist related API ->
    app.get("/wishlist", async (req, res) => {
      const result = await wishPropertyCollection.find().toArray();
      res.send(result);
    });
    app.get("/wishlist/:email/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await wishPropertyCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { userEmail: email };
      const result = await wishPropertyCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wishProperty = req.body;
      const result = await wishPropertyCollection.insertOne(wishProperty);
      res.send(result);
    });

    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await wishPropertyCollection.deleteOne(filter);
      res.send(result);
    });

    // Offered property related api =>

    app.get("/offeredProperty", async (req, res) => {
      let query = {};
      if (req.query?.agentEmail && req.query?.status === "Bought") {
        query = {
          agentEmail: req.query.agentEmail,
          status: req.query?.status,
        };
      }
      const result = await offeredPropertyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/offeredProperty", async (req, res) => {
      let query = {};
      if (req.query?.agentEmail) {
        query = { agentEmail: req.query.agentEmail };
      }
      const result = await offeredPropertyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/offeredProperty", async (req, res) => {
      const result = await offeredPropertyCollection.find().toArray();
      res.send(result);
    });

    // app.get("/offeredProperty/status", async (req, res) => {
    //   const statusFilter = "Bought";
    //   const filter = { status: statusFilter };
    //   const result = await allPropertyCollection.find(filter).toArray();
    //   res.send(result);
    // });

    app.get("/offeredProperty/:email", async (req, res) => {
      const bEmail = req.params.email;
      const filter = { buyerEmail: bEmail };
      const result = await offeredPropertyCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/offeredProperty/:email/:id", async (req, res) => {
      const id = req.params.id;
      const bEmail = req.params.email;
      const filter = { _id: new ObjectId(id), buyerEmail: bEmail };
      const result = await offeredPropertyCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/offeredProperty", async (req, res) => {
      const property = req.body;
      const result = await offeredPropertyCollection.insertOne(property);
      res.send(result);
    });

    app.patch("/offeredProperty/:id", async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: update.status,
          transactionId: update.transactionId,
        },
      };
      const result = await offeredPropertyCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // All Property related API ->

    app.get("/allProperty", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await allPropertyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allProperty", async (req, res) => {
      const result = await allPropertyCollection.find().toArray();
      res.send(result);
    });

    app.get("/allProperty/status", async (req, res) => {
      const statusFilter = "verified";
      const filter = { status: statusFilter };
      const result = await allPropertyCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/allProperty/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await allPropertyCollection.findOne(filter);
      res.send(result);
    });

    app.post("/allProperty", async (req, res) => {
      const property = req.body;
      const result = await allPropertyCollection.insertOne(property);
      res.send(result);
    });

    app.put("/allProperty/:id", async (req, res) => {
      const id = req.params.id;
      const propertyInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: propertyInfo.title,
          location: propertyInfo.location,
          price: propertyInfo.price,
          propertyImage: propertyInfo.propertyImage,
        },
      };
      const result = await allPropertyCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/allProperty/:id", async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: update.status,
        },
      };
      const result = await allPropertyCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/allProperty/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await allPropertyCollection.deleteOne(filter);
      res.send(result);
    });

    // user related api ->
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get user by email

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send("Forbidden access."); //This is optional
      }
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const existingUser = await userCollection.findOne(filter);
      if (existingUser) {
        res.send({ message: "User are already Exist.", insertedId: null });
      } else {
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: user.role,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    // payment intent - to create clientSecret
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        // this is very important.
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running.");
});

app.listen(port, () => {
  console.log(`server is running at port: ${port}`);
});
