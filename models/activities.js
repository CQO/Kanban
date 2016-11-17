//设置网站根URL
Meteor.absoluteUrl.defaultOptions.rootUrl = "http://192.168.134.252/";
//创建一个数据库
Activities = new Mongo.Collection('activities');

Activities.helpers({
  board() {
    return Boards.findOne(this.boardId);
  },
  user() {
    return Users.findOne(this.userId);
  },
  member() {
    return Users.findOne(this.memberId);
  },
  list() {
    return Lists.findOne(this.listId);
  },
  oldList() {
    return Lists.findOne(this.oldListId);
  },
  card() {
    return Cards.findOne(this.cardId);
  },
  comment() {
    return CardComments.findOne(this.commentId);
  },
  attachment() {
    return Attachments.findOne(this.attachmentId);
  },
});

Activities.before.insert((userId, doc) => {
  doc.createdAt = new Date();
});

if (Meteor.isServer) {
  // For efficiency create indexes on the date of creation, and on the date of
  // creation in conjunction with the card or board id, as corresponding views
  // are largely used in the App. See #524.
  Meteor.startup(() => {
    Activities._collection._ensureIndex({ createdAt: -1 });
    Activities._collection._ensureIndex({ cardId: 1, createdAt: -1 });
    Activities._collection._ensureIndex({ boardId: 1, createdAt: -1 });
  });


}