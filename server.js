const express = require("express");
const mysql = require("mysql");
const app = express();
const path = require("path");
const hbs = require("hbs");

const db = mysql.createConnection({
  //database parameters
  host: "localhost",
  user: "root",
  password: "root",
  port: 3306,
  database: "user-project",
});

db.connect((error) => {
  //connecting to the database
  if (error) {
    console.log(error);
  } else {
    console.log("MySQL Connected");
  }
});

const viewsPath = path.join(__dirname, "/views"); //registering views and partials
const partialPath = path.join(__dirname, "/views/inc");
const publicDirectory = path.join(__dirname, "public");
app.set("view engine", "hbs");
app.set("views", viewsPath);
hbs.registerPartials(partialPath);
app.use(express.static(publicDirectory));
app.use(express.urlencoded({ extended: false })); //allows form inputs
app.use(express.json());

app.get("/allPosts", (req, res) => {
  db.query(
    "SELECT users.name, posts.user_id, posts.title, posts.date, posts.id FROM users INNER JOIN posts ON users.id = posts.user_id WHERE 1",
    (error, results) => {
      if (!error) {
        const posts = results.map((a) => {
          let author = a.name;
          let userId = a.user_id;
          let title = a.title;
          let postId = a.id;
          let date = a.date.toDateString();
          return {
            author: author,
            userId: userId,
            title: title,
            date: date,
            postId: postId,
          };
        });
        res.render("allPosts", { posts: posts });
      } else {
        res.render("failure");
      }
    }
  );
});

app.post("/allPosts", (req, res) => {
  const searchTerm = `%${req.body.searchTerm}%`;
  const searchBy = mysql.raw(req.body.searchBy);
  const query =
    "SELECT users.name, posts.user_id, posts.title, posts.date, posts.id FROM users INNER JOIN posts ON users.id = posts.user_id WHERE ? LIKE ?";
  db.query(query, [searchBy, searchTerm], (error, results) => {
    const posts = results.map((a) => {
      let author = a.name;
      let userId = a.user_id;
      let title = a.title;
      let postId = a.id;
      let date = a.date.toDateString();
      return {
        author: author,
        userId: userId,
        title: title,
        date: date,
        postId: postId,
      };
    });
    res.render("allPosts", { posts: posts });
  });
});

app.get("/profile", (req, res) => {
  //profile page, displaying blog post titles and allowing new posts
  const id = req.query.id;
  const sqlSort = mysql.raw(req.query.sort);
  let sort = [];
  db.query(
    `SELECT users.name, users.email, posts.title, posts.date, posts.id FROM users LEFT JOIN posts ON users.id = posts.user_id WHERE users.id=? ORDER BY posts.date ?, posts.id ?`,
    [id, sqlSort, sqlSort],
    (error, results) => {
      if (!error) {
        const name = results[0].name;
        const email = results[0].email;
        if (results[0].title == undefined) {
          const posts = [{ title: "No posts found", date: "N/A" }];
          res.render("profile", {
            name: name,
            email: email,
            id: id,
            posts: posts,
          });
        } else {
          const posts = results.map((a) => {
            let title = a.title;
            let postId = a.id;
            let date = a.date.toDateString();
            return { title: title, date: date, postId: postId };
          });

          if (req.query.sort == "asc") {
            sort = "desc";
          } else {
            sort = "asc";
          }
          res.render("profile", {
            name: name,
            email: email,
            id: id,
            sort: sort,
            posts: posts,
          });
        }
      } else if (error) {
        res.send(error);
      }
    }
  );
});

app.get("/post/:id", (req, res) => {
  //displays a given blog post
  postId = req.params.id;
  db.query(
    "SELECT users.id, users.name, posts.title, posts.date, posts.content FROM users INNER JOIN posts on users.id =posts.user_id WHERE posts.id = ?",
    [postId],
    (error, results) => {
      if (results[0] == undefined) {
        const action = "display blog posts";
        const reason = "this post ID does not exist";
        res.render("failure", { action: action, reason: reason });
      } else {
        const id = results[0].id;
        const name = results[0].name;
        const title = results[0].title;
        const date = results[0].date.toDateString();
        const content = results[0].content;
        res.render("post", {
          id: id,
          name: name,
          title: title,
          date: date,
          content: content,
        });
      }
    }
  );
});

app.get("/newPost/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT name FROM users WHERE id=?", [id], (error, results) => {
    if (results[0] != undefined) {
      const name = results[0].name;
      res.render("newPost", { name: name, id: id });
    } else {
      res.send(results);
    }
  });
});

app.post("/newPost/:id", (req, res) => {
  //inserts new blog post
  const id = req.params.id;
  const title = req.body.blogTitle;
  const content = req.body.blogContent;
  let date = new Date(Date.now()).toISOString().split("T")[0];
  db.query(
    "INSERT INTO posts(user_id, title, content, date)  VALUES (?, ?, ?, ?) ",
    [id, title, content, date],
    (error, results) => {
      if (!error) {
        res.send("<h1>Successfully added blogpost</h1>");
      } else {
        res.send(error);
      }
    }
  );
});

app.get("/update/:id", (req, res) => {
  //render page for updating details, with form pre-filled
  const id = req.params.id;
  db.query(`SELECT * FROM users WHERE id=?`, [id], (error, results) => {
    if (!error) {
      res.render(`update`, { user: results[0] });
    }
  });
});

app.post("/update/:id", (req, res) => {
  // send updates to database
  const id = req.params.id;
  const name = req.body.userName;
  const email = req.body.userEmail;
  const password = req.body.userPassword;
  db.query(`SELECT * FROM users WHERE email=?`, [email], (error, results) => {
    if (results[0] == undefined || results[0].id == id) {
      const query =
          "UPDATE users SET name = ?, email=?, password=? WHERE id= ?",
        user = [name, email, password, id];
      db.query(query, user, (error, results) => {
        if (!error) {
          res.render("success", {
            action: "updated",
            name: name,
            email: email,
          });
        }
      });
    } else if (error) {
      console.log(error);
    } else {
      const reason = "email already registered in database";
      res.render("failure", {
        action: "update",
        name: name,
        email: email,
        reason: reason,
      });
    }
  });
});

app.get("/delete/:id", (req, res) => {
  //deletes entry on click of button
  const id = req.params.id;
  db.query(
    "SELECT name, email FROM users WHERE id=?",
    [id],
    (error, results) => {
      if (!error) {
        const name = results[0].name,
          email = results[0].email;
        res.render(`success`, { action: "deleted", name: name, email: email });
      }
    }
  );
  db.query("DELETE FROM users WHERE id=?", [id]);
});

app.get("/register", (req, res) => {
  //renders register user page
  res.render("register");
});

app.post("/register", (req, res) => {
  //sends new user to database
  const name = req.body.userName;
  const email = req.body.userEmail;
  const password = req.body.userPassword;
  db.query(
    `SELECT email FROM users WHERE email=?`,
    [email],
    (error, results) => {
      if (results[0] != undefined) {
        const reason = "email already registered in database";
        res.render("failure", {
          action: "register",
          name: name,
          email: email,
          reason: reason,
        });
      } else if (results[0] == undefined) {
        db.query(`INSERT INTO users SET ?`, {
          name: name,
          email: email,
          password: password,
        });
        res.render(`success`, {
          action: "registered",
          name: name,
          email: email,
        });
      }
    }
  );
});

app.get("/users", (req, res) => {
  //displays all users
  db.query("SELECT * FROM users", (error, results) => {
    if (!error) {
      res.render("users", { users: results });
    }
  });
});

app.get("/", (req, res) => {
  res.redirect("/users");
});

app.listen(5000, () => {
  console.log("Server started on port 5000");
});
