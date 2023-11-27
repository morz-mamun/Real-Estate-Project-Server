const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
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
    await client.connect();

    const userCollection = client.db("MorzeDB").collection("users");
    const allPropertyCollection = client
      .db("MorzeDB")
      .collection("allProperty");

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

    // All Property related API
    app.get("/allProperty", async (req, res) => {
      const result = await allPropertyCollection.find().toArray();
      res.send(result);
    });
    app.post("/allProperty", async (req, res) => {
      const property = req.body;
      const result = await allPropertyCollection.insertOne(property);
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

      app.delete("/users/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(filter);
        res.send(result);
      });
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
