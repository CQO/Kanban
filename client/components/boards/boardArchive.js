Template.boardListHeaderBar.events({
  'click .js-open-archived-board'() {
    Modal.open('archivedBoards');
  },
  'click .js-open-world-board'() {
    Modal.open('worldBoards');
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    this.subscribe('archivedBoards');
  },

  archivedBoards() {
    return Boards.find({archived: true,
    }, {
      sort: ['title'],
    });
  },

  events() {
    return [{
      'click .js-restore-board'() {
        const board = this.currentData();
        board.restore();
        Utils.goBoardId(board._id);
      },
    }];
  },
}).register('archivedBoards');

BlazeComponent.extendComponent({
  boards() {
    return Boards.find({
      archived: false,
      permission: "public",
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

}).register('worldBoards');

