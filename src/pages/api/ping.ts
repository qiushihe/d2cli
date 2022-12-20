import type { NextApiRequest, NextApiResponse } from "next";

type PingResponse = {
  ping: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<PingResponse>) {
  res.status(200).json({ ping: "pong" });
}
