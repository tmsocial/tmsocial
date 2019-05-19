async function* makeDummyStream() {
  yield {
    evaluation_events: {
      json: "1",
    }
  };
  await new Promise((res) => setTimeout(res, 1000));
  yield {
    evaluation_events: {
      json: "2",
    }
  };
};

export const resolvers = {
  Query: {
  },
  Mutation: {
  },
  Subscription: {
    evaluation_events: {
      subscribe(obj: any, { id }: { id: string }) {
        return makeDummyStream();
      },
    }
  }
}
