var express = require('express');
var router = express.Router();
const localStrategy = require('passport-local');
const userModel = require('G:/Project/Pinterest/pin/routes/users');
const postModel = require('G:/Project/Pinterest/pin/routes/posts');
const passport = require('passport');
const upload = require('./multer');
const { post } = require('../app');
passport.use(new localStrategy(userModel.authenticate()));


// chat gpt
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv').config()

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;


async function runChat(userInput) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    // ... other safety settings
  ];

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [{ text: "You are Khushpreet, a friendly assistant." }],
      },
      {
        role: "model",
        parts: [{ text: "Hello! Welcome to Home. My name is khushpreet. What's your name?" }],
      },
      {
        role: "user",
        parts: [{ text: "Hi" }],
      },
      {
        role: "model",
        parts: [{ text: "Hi there! Thanks for reaching out here ask me anything. Before I can answer your question, . Can you please provide more information?" }],
      },
    ],
  });

  const result = await chat.sendMessage(userInput);
  const response = result.response;
  return response.text();
}

router.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    console.log('incoming /chat req', userInput)
    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await runChat(userInput);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {nav:false});
});

router.get('/register', function (req, res, next) {
  res.render('register', {nav:false});
});

router.get('/profile', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  .populate("posts")
  res.render('profile', {user, nav:true});
});


// router.get('/feed', isLoggedIn, async function (req, res, next) {
//   const user = await userModel.findOne({ username: req.session.passport.user })
//   const posts = postModel.find()
//   .populate("user")
//   res.render('feed', {user, posts, nav:true});
// });


router.get('/feed', isLoggedIn, async function (req, res, next) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const posts = await postModel.find().populate("user"); // Add .populate("user") if user is a reference in the post model
    res.render('feed', { user, posts, nav: true });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/show/posts', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  .populate("posts")
  res.render('show', {user, nav:true});
});
// createpost
router.get('/add', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('add',  {user, nav:true});
});

router.post('/createpost', isLoggedIn, upload.single("postimage"), async function (req, res, next) {
  //  res.send("uploaded");
  const user = await userModel.findOne({ username: req.session.passport.user });
 

  const post = await postModel.create({
    user:user._id,
    title: req.body.title,
    description: req.body.description,
    image:req.file.filename
  })

  user.posts.push(post._id);
  await user.save();
  // console.log(post.image);
  res.redirect("/profile");

  // user.profileImage = req.file.filename;  // new file saved inside in always
  // await user.save();
  // console.log(user.profileImage);
  // res.redirect("/profile");
});


// upload came from multer file
// here image is a name came from file profile.ejs line 4(pencl vala form)
router.post('/fileupload', isLoggedIn, upload.single("image"), async function (req, res, next) {
  //  res.send("uploaded");
  const user = await userModel.findOne({ username: req.session.passport.user });
  user.profileImage = req.file.filename;  // new file saved inside in always
  await user.save();
  // console.log(user.profileImage);
  res.redirect("/profile");
});

router.post('/register', function (req, res, next) {
  const data = new userModel({
    username: req.body.username,
    name: req.body.fullname,
    email: req.body.email,
    contact: req.body.contact
  })

  userModel.register(data, req.body.password)
    .then(function () {
      passport.authenticate("local")(
        req, res, function () {
          res.redirect("/profile");
        });
    })
});

router.post('/login', passport.authenticate("local", {
  failureRedirect: "/",
  successRedirect: "/profile"
}), function (req, res, next) {
});

// router.post('/logout', function (req, res, next) {
//   req.logout(function (err) {
//     if (err) { return next(err); }
//     res.redirect('/');
//   });
// });

router.get('/logout', isLoggedIn, function (req, res, next) {
  // req.logout(); // Remove the callback function
  res.redirect('/');
});


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect("/")
}

module.exports = router;
