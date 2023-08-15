const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
// bcryptjs is used to encrypt password
const salt = bcrypt.genSaltSync(10);
const secret = "fubrjifnjenvknkovn";

const Post = require("./models/Post");

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect("mongodb://localhost:27017"); // connect to mongodb

// register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    // User.create({ username, password });
    res.json(userDoc);
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
});

// login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  // res.json(userDoc);
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // res.json({ message: "Login success" });
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username: userDoc.username,
      });
    });
  } else {
    res.status(400).json({ message: "Login fail" });
  }
});

// get Profile

// app.get("/profile", (req, res) => {
//   res.send(req.cookies);
//   const { token } = req.cookies;
//   jwt.verify(token, secret, {}, (err, info) => {
//     if (err) throw err;
//     res.send(info);
//     console.log(info);
//   });
// });

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

// logout
app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

// create post

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});
// });

app.get("/post", async (req, res) => {
  // const postDoc = await Post.find().populate("author", ["username"]);
  // res.json(postDoc);
  res.json(
    await Post.find().populate("author", ["username"]).sort({ createdAt: -1 })
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const PostDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(PostDoc);
});

// app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
//   let newPath = null;
//   if (req.file) {
//     const { originalname, path } = req.file;
//     const parts = originalname.split(".");
//     const ext = parts[parts.length - 1];
//     newPath = path + "." + ext;
//     fs.renameSync(path, newPath);
//   }
//   const { token } = req.cookies.token;
//   jwt.verify(token, secret, {}, async (err, info) => {
//     if (err) throw err;
//     const { title, summary, content, id } = req.body;
//     const postDoc = await Post.findById(id);
//     const isAuthor = postDoc.author.equals(info.id);
//     // res.json({ isAuthor });
//   });
// });

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }
  const { token } = req.cookies;
  // res.json(token);
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    // res.send(isAuthor);
    // if (!isAuthor) {
    //   return res.status(400).json("you are not the author");
    // }
    // await postDoc.update({
    //   title,
    //   summary,
    //   content,
    //   cover: newPath ? newPath : postDoc.cover,
    // });
    await Post.findOneAndUpdate(
      { _id: id, author: info.id },
      {
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      },
      { new: true }
    );

    res.send(postDoc);
  });
});

app.listen(4000);

// mongodb://localhost:27017
// mongodb://localhost:27017
