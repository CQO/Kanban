Lists = new Mongo.Collection('lists');

Lists.attachSchema(new SimpleSchema({
  title: {
    type: String,
  },
  archived: {
    type: Boolean,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return false;
      }
    },
  },
  boardId: {
    type: String,
  },
  createdAt: {
    type: Date,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  sort: {
    type: Number,
    decimal: true,
    // XXX We should probably provide a default
    optional: true,
  },
  updatedAt: {
    type: Date,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isUpdate) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
}));

Lists.allow({
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  update(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  remove(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  fetch: ['boardId'],
});

Lists.helpers({
  //在网页中显示卡片的函数
  cards() {
    return Cards.find(Filter.mongoSelector({
      listId: this._id,
      archived: false,
    }), { sort: ['sort'] });
  },

  allCards() {
    return Cards.find({ listId: this._id });
  },

  board() {
    return Boards.findOne(this.boardId);
  },
});

Lists.mutations({
  //清单重命名函数
  rename(title) {
    return { $set: { title }};
  },
  //清单归档函数
  archive() {
    return { $set: { archived: true }};
  },
  //清单恢复函数
  restore() {
    return { $set: { archived: false }};
  },
});

Lists.hookOptions.after.update = { fetchPrevious: false };

if (Meteor.isServer) {
  Meteor.startup(() => {
    Lists._collection._ensureIndex({ boardId: 1 });
  });
  //添加清单函数
  Lists.after.insert((userId, doc) => {
    Activities.insert({
      userId,
      type: 'list',
      activityType: 'createList',
      boardId: doc.boardId,
      listId: doc._id,
    });
  });
  //移除清单函数
  Lists.before.remove((userId, doc) => {
     Activities.insert({
       userId,
       type: 'list',
       activityType: 'removeList',
       boardId: doc.boardId,
       listId: doc._id,
       title: doc.title,
     });
  });

  //归档清单函数
  Lists.after.update((userId, doc) => {
    if (doc.archived) {
      Activities.insert({
        userId,
        type: 'list',
        activityType: 'archivedList',
        listId: doc._id,
        boardId: doc.boardId,
      });
    }
  });
}
