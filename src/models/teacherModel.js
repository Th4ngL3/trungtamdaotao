module.exports = (db) => {
  return {
    courses: db.collection('courses'),
    users: db.collection('users'),
  };
};
