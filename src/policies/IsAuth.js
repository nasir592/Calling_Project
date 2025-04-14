const jwt = require('jsonwebtoken');

module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.header.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ctx.unauthorized("Authorization header missing or invalid");
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, strapi.config.get("plugin.users-permissions.jwtSecret"));

    // Attach user to ctx
    ctx.state.user = await strapi.entityService.findOne("plugin::users-permissions.user", decoded.id);

    return true;
  } catch (err) {
    return ctx.unauthorized("Invalid or expired token");
  }
};
