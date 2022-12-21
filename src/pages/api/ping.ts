import type { NextApiRequest, NextApiResponse } from "next";

type PingResponse = {
  ping: string;
};

const handleRequest = (req: NextApiRequest, res: NextApiResponse<PingResponse>) => {
  res.status(200).json({ ping: "pong" });
};

export default handleRequest;
