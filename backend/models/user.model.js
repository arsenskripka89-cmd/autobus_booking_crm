// Represents a user entity
module.exports = {
  table: 'users',
  columns: [
    'id',
    'name',
    'email',
    'password_hash',
    'role',
    'telegram_id',
    'telegram_username',
    'phone',
    'created_at'
  ]
};
