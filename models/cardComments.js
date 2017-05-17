CardComments = new Mongo.Collection('card_comments');

CardComments.attachSchema(new SimpleSchema({
  boardId: {
    type: String,
  },
  cardId: {
    type: String,
  },
  // XXX Rename in `content`? `text` is a bit vague...
  text: {
    type: String,
  },
  // XXX We probably don't need this information here, since we already have it
  // in the associated comment creation activity
  createdAt: {
    type: Date,
    denyUpdate: false,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  // XXX Should probably be called `authorId`
  userId: {
    type: String,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return this.userId;
      }
    },
  },
}));
//卡片评论的权限
CardComments.allow({
  //新增评论
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  //更新评论
  update(userId, doc) {
    return userId === doc.userId;
  },
  //删除评论
  remove(userId, doc) {
    return userId === doc.userId;
  },
  fetch: ['userId', 'boardId'],
});

CardComments.helpers({
  user() {
    return Users.findOne(this.userId);
  },
});

CardComments.hookOptions.after.update = { fetchPrevious: false };

if (Meteor.isServer) {
  Meteor.startup(() => {
    CardComments._collection._ensureIndex({ cardId: 1, createdAt: -1 });
  });
  //在活动上记录下添加评论这一条信息
  CardComments.after.insert((userId, doc) => {
    Activities.insert({
      userId,
      activityType: 'addComment',
      boardId: doc.boardId,
      cardId: doc.cardId,
      commentId: doc._id,
    });
  });
  //删除评论同时也删掉活动记录信息
  CardComments.after.remove((userId, doc) => {
    const activity = Activities.findOne({ commentId: doc._id });
    if (activity) {
      Activities.remove(activity._id);
    }
  });
}

//CARD COMMENT REST API
if (Meteor.isServer) {
  JsonRoutes.add('GET', '/api/boards/:boardId/cards/:cardId/comments', function (req, res, next) {
    const paramBoardId = req.params.boardId;
    const paramCardId = req.params.cardId;
    JsonRoutes.sendResult(res, {
      code: 200,
      data: CardComments.find({ boardId: paramBoardId, cardId: paramCardId}).map(function (doc) {
        return {
          _id: doc._id,
          comment: doc.text,
          authorId: doc.userId,
        };
      }),
    });
  });

  JsonRoutes.add('GET', '/api/boards/:boardId/cards/:cardId/comments/:commentId', function (req, res, next) {
    const paramBoardId = req.params.boardId;
    const paramCommentId = req.params.commentId;
    const paramCardId = req.params.cardId;
    JsonRoutes.sendResult(res, {
      code: 200,
      data: CardComments.findOne({ _id: paramCommentId, cardId: paramCardId, boardId: paramBoardId }),
    });
  });

  JsonRoutes.add('POST', '/api/boards/:boardId/cards/:cardId/comments', function (req, res, next) {
    const paramBoardId = req.params.boardId;
    const paramCardId = req.params.cardId;
    const id = CardComments.insert({
      userId: req.body.authorId,
      text: req.body.comment,
      cardId: paramCardId,
      boardId: paramBoardId,
    });
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: id,
      },
    });
  });

  JsonRoutes.add('DELETE', '/api/boards/:boardId/cards/:cardId/comments/:commentId', function (req, res, next) {
    const paramBoardId = req.params.boardId;
    const paramCommentId = req.params.commentId;
    const paramCardId = req.params.cardId;
    CardComments.remove({ _id: paramCommentId, cardId: paramCardId, boardId: paramBoardId });
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: paramCardId,
      },
    });
  });
}
