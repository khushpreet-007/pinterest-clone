var express = require('express');
var router = express.Router();
const localStrategy = require('passport-local');
const userModel = require('G:/Project/Pinterest/pin/routes/users');
const postModel = require('G:/Project/Pinterest/pin/routes/posts');



const passport = require('passport');
const upload = require('./multer');
const { post } = require('../app');
passport.use(new localStrategy(userModel.authenticate()));

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
