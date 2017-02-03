// 我们在两个地方使用活动字段：
// 1. 看板的侧边栏
// 2. 卡片的标签

Meteor.publish('activities', (kind, id, limit, hideSystem) => {
  check(kind, Match.Where((x) => {
    return ['board', 'card'].indexOf(x) !== -1;
  }));
  check(id, String);
  check(limit, Number);
  check(hideSystem, Boolean);

  const selector = (hideSystem) ? {$and: [{activityType: 'addComment'}, {[`${kind}Id`]: id}]} : {[`${kind}Id`]: id};
  return Activities.find(selector, {
    limit,
    sort: {createdAt: -1},
  });
});
