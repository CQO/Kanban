//判断用户是否为板块管理员
allowIsBoardAdmin = function(userId, board) {
  return board && board.hasAdmin(userId);
};
//判断用户是否为板块成员
allowIsBoardMember = function(userId, board) {
  return board && board.hasMember(userId);
};

allowIsBoardMemberByCard = function(userId, card) {
  const board = card.board();
  return board && board.hasMember(userId);
};
