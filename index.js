const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const port = process.env.PORT || 8000;
// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("EventiFyDb").collection("users");
    const contactsCollection = client.db("EventiFyDb").collection("contacts");
    const eventsCollection = client.db("EventiFyDb").collection("events");
    const blogsCollection = client.db("EventiFyDb").collection("blogs");
    const reviewsCollection = client.db("EventiFyDb").collection("reviews");
    const faqsCollection = client.db("EventiFyDb").collection("faqs");
    const commentsCollection = client.db("EventiFyDb").collection("comments");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("I need a new jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // Save or modify user email, status in DB
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const isExist = await userCollection.findOne(query);
      console.log("User found?----->", isExist);
      if (isExist) return res.send(isExist);
      const result = await userCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      );
      res.send(result);
    });

    //services related Apis
    app.get("/services", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    //blogs related apis
    app.get("/blog", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    //reviews related apis
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    //faqs related apis
    app.get("/faqs", async (req, res) => {
      const result = await faqsCollection.find().toArray();
      res.send(result);
    });


    //user comments related apis

    //----> Handle POST request to save comments
    app.post("/blog/comment",verifyToken, async (req, res) => {
      try {
        const { displayName, photoURL, email, blogId, comment } = req.body;
        const result = await commentsCollection.insertOne({
          displayName,
          photoURL,
          email,
          blogId,
          comment,
          createdAt: new Date(),
        });
        res.status(201).json({ message: "Comment saved successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving comment" });
      }
    });

    //contacts related apis
    app.post("/contact", async (req, res) => {
      try {
        const { name, email, textarea } = req.body;
        const result = await contactsCollection.insertOne({
          name,
          email,
          message: textarea,
        });

        res.status(201).json({ message: "Contact saved successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving contact" });
      }
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
  res.send("Hello from EventiFy Server..");
});

app.listen(port, () => {
  console.log(`EventiFy is running on port ${port}`);
});
