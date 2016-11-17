
const noValidate = {
  validate: false,
  filter: false,
  autoConvert: false,
  removeEmptyStrings: false,
  getAutoValues: false,
};
const noValidateMulti = { ...noValidate, multi: true };

Migrations.add('board-background-color', () => {
  const defaultColor = '#16A085';
  Boards.update({
    background: {
      $exists: false,
    },
  }, {
    $set: {
      background: {
        type: 'color',
        color: defaultColor,
      },
    },
  }, noValidateMulti);
});

Migrations.add('lowercase-board-permission', () => {
  ['Public', 'Private'].forEach((permission) => {
    Boards.update(
      { permission },
      { $set: { permission: permission.toLowerCase() } },
      noValidateMulti
    );
  });
});


Migrations.add('change-attachments-type-for-non-images', () => {
  const newTypeForNonImage = 'application/octet-stream';
  Attachments.find().forEach((file) => {
    if (!file.isImage()) {
      Attachments.update(file._id, {
        $set: {
          'original.type': newTypeForNonImage,
          'copies.attachments.type': newTypeForNonImage,
        },
      }, noValidate);
    }
  });
});

Migrations.add('card-covers', () => {
  Cards.find().forEach((card) => {
    const cover =  Attachments.findOne({ cardId: card._id, cover: true });
    if (cover) {
      Cards.update(card._id, {$set: {coverId: cover._id}}, noValidate);
    }
  });
  Attachments.update({}, {$unset: {cover: ''}}, noValidateMulti);
});

//用户更换看板颜色事件
Migrations.add('use-css-class-for-boards-colors', () => {
  const associationTable = {
    '#27AE60': 'nephritis',
    '#C0392B': 'pomegranate',
    '#2980B9': 'belize',
    '#8E44AD': 'wisteria',
    '#2C3E50': 'midnight',
    '#E67E22': 'pumpkin',
  };
  Boards.find().forEach((board) => {
    const oldBoardColor = board.background.color;
    const newBoardColor = associationTable[oldBoardColor];
    Boards.update(board._id, {
      $set: { color: newBoardColor },
      $unset: { background: '' },
    }, noValidate);
  });
});

Migrations.add('denormalize-star-number-per-board', () => {
  Boards.find().forEach((board) => {
    const nStars = Users.find({'profile.starredBoards': board._id}).count();
    Boards.update(board._id, {$set: {stars: nStars}}, noValidate);
  });
});

// 保留用户操作痕迹
Migrations.add('add-member-isactive-field', () => {
  Boards.find({}, {fields: {members: 1}}).forEach((board) => {
    const allUsersWithSomeActivity = _.chain(
      Activities.find({ boardId: board._id }, { fields:{ userId:1 }}).fetch())
        .pluck('userId')
        .uniq()
        .value();
    const currentUsers = _.pluck(board.members, 'userId');
    const formerUsers = _.difference(allUsersWithSomeActivity, currentUsers);

    const newMemberSet = [];
    board.members.forEach((member) => {
      member.isActive = true;
      newMemberSet.push(member);
    });
    formerUsers.forEach((userId) => {
      newMemberSet.push({
        userId,
        isAdmin: false,
        isActive: false,
      });
    });
    Boards.update(board._id, {$set: {members: newMemberSet}}, noValidate);
  });
});
