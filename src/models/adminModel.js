module.exports = (db) => {
  return {
    users: db.collection('users'),
    courses: db.collection('courses'),
  };
};
