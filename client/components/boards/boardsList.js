
BlazeComponent.extendComponent({
  boards() {
    return Boards.find({archived: false,
      'members': { $elemMatch: { userId: Meteor.userId(), isActive: true }},
    }, {
      sort: ['title'],
    });
  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(this.currentData()._id);
  },

  events() {
    return [{
      'click .js-add-board': Popup.open('createBoard'),
      'click .js-star-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.user().toggleBoardStar(boardId);
        evt.preventDefault();
      },
      'click .js-accept-invite'() {
        const boardId = this.currentData()._id;
        Meteor.user().removeInvite(boardId);
      },
      'click .js-decline-invite'() {
        const boardId = this.currentData()._id;
        Meteor.call('quitBoard', boardId, (err, ret) => {
          if (!err && ret) {
            Meteor.user().removeInvite(boardId);
            FlowRouter.go('home');
          }
        });
      },
    }];
  },
}).register('boardList');

BlazeComponent.extendComponent({
  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  events() {
    return [{
      //移动清单到其他板块
      'click .js-select-list'() {
        const targetBoard = this.currentData()._id;//目标板块的id
        const listsId = Session.get('call')._id;
        const listTitle = Session.get('call').title;
        const targetID = Lists.insert({ title: listTitle, boardId: targetBoard }, { extendAutoValueContext: { userId: 'eFxXGteFtEjA3XCeH' } });
        Cards.find({ listId: listsId }).forEach((card) => {
          Cards.insert({title:card.title,members:[],labelIds:[],listId: targetID,boardId: targetBoard,sort: 4});
        });
      },
    }];
  },
}).register('boardCatalog');
