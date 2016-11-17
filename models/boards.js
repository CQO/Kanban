Boards = new Mongo.Collection('boards');

Boards.attachSchema(new SimpleSchema({
  title: {
    type: String,
  },
  slug: {
    type: String,
    autoValue() {
      if (this.isInsert && !this.isSet) {
        let slug = 'board';
        const title = this.field('title');
        if (title.isSet) {
          slug = getSlug(title.value) || slug;
        }
        return slug;
      }
    },
  },
  archived: {
    type: Boolean,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return false;
      }
    },
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
  // XXX Inconsistent field naming
  modifiedAt: {
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
  // De-normalized number of users that have starred this board
  stars: {
    type: Number,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return 0;
      }
    },
  },
  // De-normalized label system
  'labels': {
    type: [Object],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        const colors = Boards.simpleSchema()._schema['labels.$.color'].allowedValues;
        const defaultLabelsColors = _.clone(colors).splice(0, 6);
        return defaultLabelsColors.map((color) => ({
          color,
          _id: Random.id(6),
          name: '',
        }));
      }
    },
  },
  'labels.$._id': {
    // We don't specify that this field must be unique in the board because that
    // will cause performance penalties and is not necessary since this field is
    // always set on the server.
    // XXX Actually if we create a new label, the `_id` is set on the client
    // without being overwritten by the server, could it be a problem?
    type: String,
  },
  'labels.$.name': {
    type: String,
    optional: true,
  },
  'labels.$.color': {
    type: String,
    allowedValues: [
      'green', 'yellow', 'orange', 'red', 'purple',
      'blue', 'sky', 'lime', 'pink', 'black',
    ],
  },
  // XXX We might want to maintain more informations under the member sub-
  // documents like de-normalized meta-data (the date the member joined the
  // board, the number of contributions, etc.).
  'members': {
    type: [Object],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return [{
          userId: this.userId,
          isAdmin: true,
          isActive: true,
        }];
      }
    },
  },
  'members.$.userId': {
    type: String,
  },
  'members.$.isAdmin': {
    type: Boolean,
  },
  'members.$.isActive': {
    type: Boolean,
  },
  permission: {
    type: String,
    allowedValues: ['public', 'private'],
  },
  color: {
    type: String,
    allowedValues: [
      'belize',
      'nephritis',
      'pomegranate',
      'pumpkin',
      'wisteria',
      'midnight',
    ],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return Boards.simpleSchema()._schema.color.allowedValues[0];
      }
    },
  },
  description: {
    type: String,
    optional: true,
  },
}));


Boards.helpers({
  //板块访问规则
  //任何人都可以访问公开看板
  //必须是板块内成员才可以访问私密看板
  isVisibleBy(user) {
    if(this.isPublic()) {return true;}
    else {return user && this.isActiveMember(user._id);}
  },

  //判断用户是否为板块成员
  isActiveMember(userId) {
    if(userId) {return this.members.find((member) => (member.userId === userId && member.isActive));}
    else {return false;}
  },

  //判断板块是否为公开
  isPublic() {
    return this.permission === 'public';
  },

  lists() {
    return Lists.find({ boardId: this._id, archived: false }, { sort: { sort: 1 }});
  },
  //返回板块活动
  activities() {
    return Activities.find({ boardId: this._id }, { sort: { createdAt: -1 }});
  },
  //返回板块成员
  activeMembers() {
    return _.where(this.members, {isActive: true});
  },
  //返回板块管理员
  activeAdmins() {
    return _.where(this.members, {isActive: true, isAdmin: true});
  },
  //返回板块成员
  memberUsers() {
    return Users.find({ _id: {$in: _.pluck(this.members, 'userId')} });
  },
  //返回板块标签信息
  getLabel(name, color) {
    return _.findWhere(this.labels, { name, color });
  },
  //返回板块标签索引
  labelIndex(labelId) {
    return _.pluck(this.labels, '_id').indexOf(labelId);
  },
  //返回板块成员索引
  memberIndex(memberId) {
    return _.pluck(this.members, 'userId').indexOf(memberId);
  },
  //判断用户是否为成员
  hasMember(memberId) {
    return !!_.findWhere(this.members, {userId: memberId, isActive: true});
  },
  //判断用户是否为管理员
  hasAdmin(memberId) {
    return !!_.findWhere(this.members, {userId: memberId, isActive: true, isAdmin: true});
  },
  //返回板块地址
  absoluteUrl() {
    return FlowRouter.url('board', { id: this._id, slug: this.slug });
  },
  //返回当前板块设置颜色
  colorClass() {
    return `board-color-${this.color}`;
  },

  // XXX currently mutations return no value so we have an issue when using addLabel in import
  // XXX waiting on https://github.com/mquandalle/meteor-collection-mutations/issues/1 to remove...
  pushLabel(name, color) {
    const _id = Random.id(6);
    console.log(_id);
    Boards.direct.update(this._id, { $push: {labels: { _id, name, color }}});
    return _id;
  },
});

Boards.mutations({
  //归档板块
  archive() {
    return { $set: { archived: true }};
  },
  //恢复板块
  restore() {
    console.log("restore");
    return { $set: { archived: false }};
  },
  //更改板块标题
  rename(title) {
    return { $set: { title }};
  },
  //更改板块描述
  setDesciption(description) {
    return { $set: {description} };
  },
  //更改板块颜色
  setColor(color) {
    return { $set: { color }};
  },
  //设置板块公开程度
  setVisibility(visibility) {
    return { $set: { permission: visibility }};
  },
  //创建标签事件
  addLabel(name, color) {
    //拒绝增加相同颜色并且名称相同的标签
    if (!this.getLabel(name, color)) {
      const _id = Random.id(6);
      return { $push: {labels: { _id, name, color }}};
    }
    return {};
  },
  //更改标签名称事件
  editLabel(labelId, name, color) {
    if (!this.getLabel(name, color)) {
      const labelIndex = this.labelIndex(labelId);
      return {
        $set: {
          [`labels.${labelIndex}.name`]: name,
          [`labels.${labelIndex}.color`]: color,
        },
      };
    }
    return {};
  },
  //删除标签事件
  removeLabel(labelId) {
    console.log("removeLabel");
    return { $pull: { labels: { _id: labelId }}};
  },
  //板块增加成员
  addMember(memberId) {
    const memberIndex = this.memberIndex(memberId);
    if (memberIndex >= 0) {
      return {
        $set: {
          [`members.${memberIndex}.isActive`]: true,
        },
      };
    }

    return {
      $push: {
        members: {
          userId: memberId,
          isAdmin: false,
          isActive: true,
        },
      },
    };
  },
  //板块移除成员
  removeMember(memberId) {
    const memberIndex = this.memberIndex(memberId);
    // 板块中至少要有一个管理员
    const allowRemove = (!this.members[memberIndex].isAdmin) || (this.activeAdmins().length > 1);
    if (!allowRemove) {
      return {
        $set: {
          [`members.${memberIndex}.isActive`]: true,
        },
      };
    }

    return {
      $set: {
        [`members.${memberIndex}.isActive`]: false,
        [`members.${memberIndex}.isAdmin`]: false,
      },
    };
  },
  //设置成员权限
  setMemberPermission(memberId, isAdmin) {
    const memberIndex = this.memberIndex(memberId);
    // 不能自己给自己加权限
    if (memberId === Meteor.userId()) {
      isAdmin = this.members[memberIndex].isAdmin;
    }

    return {
      $set: {
        [`members.${memberIndex}.isAdmin`]: isAdmin,
      },
    };
  },
});

if (Meteor.isServer) {
  //板块操作权限
  Boards.allow({
    insert: Meteor.userId,
    update: allowIsBoardAdmin,
    remove: allowIsBoardAdmin,
    fetch: ['members'],
  });

  // The number of users that have starred this board is managed by trusted code
  // and the user is not allowed to update it
  Boards.deny({
    update(userId, board, fieldNames) {
      return _.contains(fieldNames, 'stars');
    },
    fetch: [],
  });

  // 如果它是最后一个管理员，我们不能删除成员
  Boards.deny({
    update(userId, doc, fieldNames, modifier) {
      if (!_.contains(fieldNames, 'members'))
        return false;

      // 我们只关心拉取操作？
      if (!_.isObject(modifier.$pull && modifier.$pull.members))
        return false;

      // 如果管理员数量>1，他可以删除所有人
      const nbAdmins = _.where(doc.members, {isActive: true, isAdmin: true}).length;
      if (nbAdmins > 1)
        return false;

      // 不能删除一个管理员用户
      const removedMemberId = modifier.$pull.members.userId;
      return Boolean(_.findWhere(doc.members, {
        userId: removedMemberId,
        isAdmin: true,
      }));
    },
    fetch: ['members'],
  });

  Meteor.methods({
    quitBoard(boardId) {
      check(boardId, String);
      const board = Boards.findOne(boardId);
      if (board) {
        const userId = Meteor.userId();
        const index = board.memberIndex(userId);
        if (index>=0) {
          board.removeMember(userId);
          return true;
        } else throw new Meteor.Error('error-board-notAMember');
      } else throw new Meteor.Error('error-board-doesNotExist');
    },
  });
}

if (Meteor.isServer) {
  // 防止一个个板块有两个相同的人
  Meteor.startup(() => {
    Boards._collection._ensureIndex({
      _id: 1,
      'members.userId': 1,
    }, { unique: true });
  });

  // 用户注册初始创建的示例板块
  Boards.after.insert((userId, doc) => {
    Activities.insert({
      userId,
      type: 'board',
      activityTypeId: doc._id,
      activityType: 'createBoard',
      boardId: doc._id,
    });
  });

  // 如果有人删除一个标签，那么在所有板块上移除这个标签？
  Boards.after.update((userId, doc, fieldNames, modifier) => {
    if (!_.contains(fieldNames, 'labels') ||
      !modifier.$pull ||
      !modifier.$pull.labels ||
      !modifier.$pull.labels._id) {
      return;
    }

    const removedLabelId = modifier.$pull.labels._id;
    Cards.update(
      { boardId: doc._id },
      {
        $pull: {
          labelIds: removedLabelId,
        },
      },
      { multi: true }
    );
  });

  // 板块成员变动函数
  Boards.after.update((userId, doc, fieldNames, modifier) => {
    if (!_.contains(fieldNames, 'members')) {
      return;
    }
    let memberId;
    // 增加新成员
    if (modifier.$push && modifier.$push.members) {
      memberId = modifier.$push.members.userId;
      Activities.insert({
        userId,
        memberId,
        type: 'member',
        activityType: 'addBoardMember',
        boardId: doc._id,
      });
    }

    // 移除用户
    if (modifier.$pull && modifier.$pull.members) {
      memberId = modifier.$pull.members.userId;
      Activities.insert({
        userId,
        memberId,
        type: 'member',
        activityType: 'removeBoardMember',
        boardId: doc._id,
      });
    }
  });
}