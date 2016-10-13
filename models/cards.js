Cards = new Mongo.Collection('cards');

Cards.attachSchema(new SimpleSchema({
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
  listId: {
    type: String,
  },
  // The system could work without this `boardId` information (we could deduce
  // the board identifier from the card), but it would make the system more
  // difficult to manage and less efficient.
  boardId: {
    type: String,
  },
  coverId: {
    type: String,
    optional: true,
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
  dateLastActivity: {
    type: Date,
    autoValue() {
      return new Date();
    },
  },
  description: {
    type: String,
    optional: true,
  },
  labelIds: {
    type: [String],
    optional: true,
  },
  members: {
    type: [String],
    optional: true,
  },
  // XXX Should probably be called `authorId`. Is it even needed since we have
  // the `members` field?
  userId: {
    type: String,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return this.userId;
      }
    },
  },
  sort: {
    type: Number,
    decimal: true,
  },
}));

Cards.allow({
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

Cards.helpers({
  list() {
    return Lists.findOne(this.listId);
  },

  board() {
    return Boards.findOne(this.boardId);
  },

  labels() {
    const boardLabels = this.board().labels;
    const cardLabels = _.filter(boardLabels, (label) => {
      return _.contains(this.labelIds, label._id);
    });
    return cardLabels;
  },

  hasLabel(labelId) {
    return _.contains(this.labelIds, labelId);
  },

  user() {
    return Users.findOne(this.userId);
  },

  isAssigned(memberId) {
    return _.contains(this.members, memberId);
  },

  activities() {
    return Activities.find({ cardId: this._id }, { sort: { createdAt: -1 }});
  },

  comments() {
    return CardComments.find({ cardId: this._id }, { sort: { createdAt: -1 }});
  },

  attachments() {
    return Attachments.find({ cardId: this._id }, { sort: { uploadedAt: -1 }});
  },

  cover() {
    const cover = Attachments.findOne(this.coverId);
    // if we return a cover before it is fully stored, we will get errors when we try to display it
    // todo XXX we could return a default "upload pending" image in the meantime?
    return cover && cover.url() && cover;
  },
  //获取绝对路径
  absoluteUrl() {
    const board = this.board();
    return FlowRouter.url('card', {
      boardId: board._id,
      slug: board.slug,
      cardId: this._id,
    });
  },
});

Cards.mutations({
  //卡片归档函数
  archive() {
    return { $set: { archived: true }};
  },
  //卡片还原归档函数
  restore() {
    console.log("restore");
    return { $set: { archived: false }};
  },
  //更改卡片标题的函数
  setTitle(title) {
    console.log("setTitle");
    return { $set: { title }};
  },
  //卡片更改描述函数
  setDescription(description) {
    return { $set: { description }};
  },
  //移动卡片的函数
  move(listId, sortIndex) {
    const mutatedFields = { listId };
    if (sortIndex) {
      mutatedFields.sort = sortIndex;
    }
    return { $set: mutatedFields };
  },
  //卡片增加标签
  addLabel(labelId) {
    return { $addToSet: { labelIds: labelId }};
  },
  //卡片移除标签'
  removeLabel(labelId) {
    return { $pull: { labelIds: labelId }};
  },
  //卡片 移除/增加 标签
  toggleLabel(labelId) {
    if (this.labelIds && this.labelIds.indexOf(labelId) > -1) {
      return this.removeLabel(labelId);
    } else {
      return this.addLabel(labelId);
    }
  },
  //卡片增加成员
  assignMember(memberId) {
    return { $addToSet: { members: memberId }};
  },
  //删除卡片协作成员
  unassignMember(memberId) {
    return { $pull: { members: memberId }};
  },
  //卡片 移除/增加 标签
  toggleMember(memberId) {
    if (this.members && this.members.indexOf(memberId) > -1) {
      return this.unassignMember(memberId);
    } else {
      return this.assignMember(memberId);
    }
  },

  setCover(coverId) {
    console.log("setCover");
    return { $set: { coverId }};
  },

  unsetCover() {
    console.log("unsetCover");
    return { $unset: { coverId: '' }};
  },
});

if (Meteor.isServer) {
  // 面板经常调用这些功能，所以我们创建索引，以使查询效率更高。
  Meteor.startup(() => {
    Cards._collection._ensureIndex({ boardId: 1 });
  });
  //插入卡片服务端函数
  Cards.after.insert((userId, doc) => {
    Activities.insert({
      userId,
      activityType: 'createCard',
      boardId: doc.boardId,
      listId: doc.listId,
      cardId: doc._id,
    });
  });

  // 更改卡片标题所发生的函数
  Cards.after.update((userId, doc, fieldNames) => {
    if (_.contains(fieldNames, 'archived')) {
      if (doc.archived) {
        Activities.insert({
          userId,
          activityType: 'archivedCard',
          boardId: doc.boardId,
          listId: doc.listId,
          cardId: doc._id,
        });
      } else {
        Activities.insert({
          userId,
          activityType: 'restoredCard',
          boardId: doc.boardId,
          listId: doc.listId,
          cardId: doc._id,
        });
      }
    }
  });

  // 移动卡片发生的事件
  Cards.after.update(function(userId, doc, fieldNames) {
    const oldListId = this.previous.listId;
    if (_.contains(fieldNames, 'listId') && doc.listId !== oldListId) {
      Activities.insert({
        userId,
        oldListId,
        activityType: 'moveCard',
        listId: doc.listId,
        boardId: doc.boardId,
        cardId: doc._id,
      });
    }
  });

  //卡片状态发生改变的函数
  Cards.before.update((userId, doc, fieldNames, modifier) => {
    if (!_.contains(fieldNames, 'members'))
      return;
    let memberId;
    // Say hello to the new member
    if (modifier.$addToSet && modifier.$addToSet.members) {
      memberId = modifier.$addToSet.members;
      if (!_.contains(doc.members, memberId)) {
        Activities.insert({
          userId,
          memberId,
          activityType: 'joinMember',
          boardId: doc.boardId,
          cardId: doc._id,
        });
      }
    }

    // Say goodbye to the former member
    if (modifier.$pull && modifier.$pull.members) {
      memberId = modifier.$pull.members;
      Activities.insert({
        userId,
        memberId,
        activityType: 'unjoinMember',
        boardId: doc.boardId,
        cardId: doc._id,
      });
    }
  });

  //删除所有与卡片相关联的活动
  Cards.after.remove((userId, doc) => {
    Activities.remove({
      cardId: doc._id,
    });
  });
}
