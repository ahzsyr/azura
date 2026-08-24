import type { PipelineContext, PipelineMiddleware } from "./command-bus";

export const validationMiddleware: PipelineMiddleware = async (ctx, next) => {
  ctx.data.validated = true;
  return next();
};

export const spamMiddleware: PipelineMiddleware = async (ctx, next) => {
  ctx.data.spamChecked = true;
  return next();
};

export const scoringMiddleware: PipelineMiddleware = async (ctx, next) => {
  if (ctx.data.score == null) ctx.data.score = 0;
  return next();
};

export const eventMiddleware: PipelineMiddleware = async (ctx, next) => {
  const result = await next();
  ctx.data.eventsEmitted = true;
  return result;
};

export const DEFAULT_SUBMIT_MIDDLEWARE: PipelineMiddleware[] = [
  validationMiddleware,
  spamMiddleware,
  scoringMiddleware,
  eventMiddleware,
];
