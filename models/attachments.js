//设置上传附件方式是分段？
Attachments = new FS.Collection('attachments', {
  stores: [
    new FS.Store.GridFS('attachments'),
  ],
});

if (Meteor.isServer) {
  //附件权限
  Attachments.allow({
    insert(userId, doc) {
      return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    update(userId, doc) {
      return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    remove(userId, doc) {
      return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    // - 如果板块是开放的，那么任何人都可以下载附件
    // - 如果板块是私密的，那么只有板块成员可以下载附件
    download(userId, doc) {
      const query = {$or: [{ 'members.userId': userId },{ permission: 'public' },],};
      return Boolean(Boards.findOne(doc.boardId, query));
    },
    fetch: ['boardId'],
  });
}

// XXX Enforce a schema for the Attachments CollectionFS

Attachments.files.before.insert((userId, doc) => {
  const file = new FS.File(doc);
  doc.userId = userId;
  //上传的附件类型如果不是图片那么设置文件类型为二进制流
  if (!file.isImage()) {
    file.original.type = 'application/octet-stream';
  }
});

if (Meteor.isServer) {
  Attachments.files.after.insert((userId, doc) => {
    Activities.insert({
      userId,
      type: 'card',
      activityType: 'addAttachment',
      attachmentId: doc._id,
      boardId: doc.boardId,
      cardId: doc.cardId,
    });
  });

  Attachments.files.after.remove((userId, doc) => {
    Activities.remove({
      attachmentId: doc._id,
    });
  });
}
