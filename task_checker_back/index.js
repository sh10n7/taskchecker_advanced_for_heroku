const express = require("express");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase_serviceAccountKey.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

// prismaを読み込む記述
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// cors対策
const cors = require('cors')
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// expressの導入
const { body, validationResult } = require('express-validator');
app.use(express.urlencoded({ extended: true }));


// タスクの読み取り処理
app.get("/tasks", async(req, res) => {
  try {
  const AllTasks = await prisma.task.findMany();
  res.json(AllTasks)
  } catch(error) {
  console.log(error)
  }
})

// ジャンルの読み取り処理
app.get("/genres", async(req, res) => {
  try {
  const AllGenres = await prisma.genre.findMany();
  res.json(AllGenres)
  } catch(error) {
  console.log(error)
  }
})

// タスクの作成
app.post("/tasks", 

//バリデーションの追加
[
  //genreIdの値が必須、かつ整数値であること。
  body('genreId').exists().withMessage('genreId is required')
  .isInt().withMessage('genreId should be Number'),

  //titleが必須であること
  body('name').exists().withMessage('name is required'),

  //explanationが必須であること
  body('explanation').exists().withMessage('explanation is required'),

  //deadlinedateは必須であること、
  body('deadlineDate').exists().withMessage('deadlineDate is required')
  .isDate().withMessage('deadlineDate must be a valid date') //日付の有効性をチェック(これだけでもOK)
  .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('deadlineDate must be in the format YYYY-MM-DD'), // 厳密に調べるために4桁-2桁-2桁の正規表現でチェック

  //担当者は必須であること
  body('assigneeId').exists().withMessage('assigneeId is required'),

  //作成者のIDは必須であること
  body('uid').exists().withMessage('assigneeId is required')
],



async (req, res) => {
  const errors = validationResult(req);
  console.log(errors)
  if(!errors.isEmpty()){
    return res.status(400).json({ errors: errors.array()});
  }

  try {
    const deadlineDate = new Date(req.body.deadlineDate)
    const savedData = await prisma.task.create({
      data: {
        ...req.body,
        status: 0,
        deadlineDate: deadlineDate
      },
    });
    res.json(savedData)
  } catch(error) {
    res.status(500).send("タスクの保存に失敗しました")
  }
})

// タスクの更新
app.put("/tasks/:id", async(req, res) => {
  try{
    const deadlineDate = new Date(req.body.deadlineDate)
    const taskId = parseInt(req.params.id, 10);
    const updateData = await prisma.task.update({where:{id: taskId}, data: {
      ...req.body,
      deadlineDate: deadlineDate
    },
    })
    res.json(updateData)
  } catch(error) {
    res.status(500).send("タスクの更新に失敗しました。")
  }
})

// タスクの削除
app.delete("/tasks/:id", async(req, res) => {
  console.log(req)
  try {
    const taskId = parseInt(req.params.id, 10);
    const deletedTask = await prisma.task.delete({where: {id: taskId}})
    res.json(deletedTask)
  } catch(error) {
    res.status(500).send("タスクの削除に失敗しました")
  }
})

// ジャンルの作成
app.post("/genres", async (req, res) => {
  try {
    const savedData = await prisma.genre.create({data: req.body});
    res.json(savedData)
  } catch(error) {
    res.status(500).send("ジャンルの保存に失敗しました")
  }
})

// ジャンルの削除
app.delete("/genres/:id", async (req, res) => {
  try {
    const genreId = parseInt(req.params.id, 10);
    await prisma.genre.delete({where:{id: genreId}})
    return res.status(200).send();
  } catch(error) {
    res.status(500).send("ジャンルの削除に失敗しました。")
  }
})

// ステータスの更新
app.put("/tasks/:id/status", async(req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const newStatus = parseInt(req.body.newStatus, 10);
    const response = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus }
    });
    res.json(response)
  } catch(error) {
    console.log(error)
    res.status(500).send("ステータス変更に失敗しました。")
  }
})

// JWTトークン検証の処理
const verifyToken = async (req, res, next) => {
  // AuthorizationヘッダーからBearerトークンを抽出
  const token = req.headers.authorization.split("Bearer ")[1];
  try {
    // Firebase Admin SDKのverifyIdTokenメソッドを使用して、tokenの検証を実施。
    // tokenが正しい場合はdecodedTokenにユーザー情報が含まれ、next()次の処理に進む。
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch(error) {
    res.status(403).send('idが確認できませんでした');
  }
}

// マイページ表示用のタスク
app.get('/mytasks', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    const AllTasks = await prisma.task.findMany();
    const MyTasks = AllTasks.filter(task => uid === task.uid);
    res.json(MyTasks);
  } catch(error) {
    res.status(500).send('データの取得ができませんでした');
  }
})

app.get('/users', async(req, res) => {
  // レスポンス返却用の配列を準備
  let allUsers = [];

  // ユーザーのリストを取得するための非同期関数
  const listAllUsers = async (nextPageToken) => {
    try {
      // Firebase Authenticationからユーザー情報を取得
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      // 取得したユーザー情報を配列に追加
      allUsers = allUsers.concat(listUsersResult.users.map(userRecord => userRecord.toJSON()));

      // 次のページトークンがあれば、次のバッチのユーザーも取得
      if (listUsersResult.pageToken) {
        // 再帰的に次のバッチのユーザーを取得
        await listAllUsers(listUsersResult.pageToken);
      }
    } catch (error) {
      console.log('Error listing users:', error);
      throw error; // エラーをスローして、後続の処理を停止
    }
  };
  // リスト収集のメソッド呼び出し
  try {
    await listAllUsers();
    res.json(allUsers);
  }catch(error){
    res.status(500).send("ユーザーリストの取得に失敗しました。");
  }
})

// コメント投稿
app.post('/comment', async(req, res) => {
  try {
    const deadlineDate = new Date(req.body.deadlineDate)
    const savedData = await prisma.comment.create({data: req.body});
    res.json(savedData)
  } catch(error) {
    res.status(500).send("コメントの保存に失敗しました")
  }
})

// コメントの読み取り処理
app.get("/comments", async(_, res) => {
  try {
  const AllComments = await prisma.comment.findMany();
  res.json(AllComments)
  } catch(error) {
  console.log(error)
  }
})

// コメントの削除
app.delete("/comment/:id", async (req, res) => {
  const commentId = parseInt(req.params.id, 10);
  try {
    const deleteComment = await prisma.comment.delete({where:{id: commentId}})
    res.json(deleteComment);
  } catch(error) {
    res.status(500).send("コメントの削除に失敗しました。")
  }
})

// サーバー起動処理
app.listen(3000, () => {
  console.log("listening on localhost 3000")
})  