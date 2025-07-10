import { JSONValue } from "ai";
import { Dispatch, memo, SetStateAction } from "react";

import { UIBlock } from "./block";
import { useBlockStream } from "./use-block-stream";

interface BlockStreamHandlerProps {
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  streamingData: JSONValue[] | undefined;
}

export function PureBlockStreamHandler({
  setBlock,
  streamingData,
}: BlockStreamHandlerProps) {
  useBlockStream({
    streamingData,
    setBlock,
  });

  return null;
}

function areEqual(
  prevProps: BlockStreamHandlerProps,
  nextProps: BlockStreamHandlerProps,
) {
  // Compare setBlock function reference
  if (prevProps.setBlock !== nextProps.setBlock) {
    return false;
  }

  // If both are undefined/null, they're equal
  if (!prevProps.streamingData && !nextProps.streamingData) {
    return true;
  }

  // If only one is undefined/null, they're different
  if (!prevProps.streamingData || !nextProps.streamingData) {
    return false;
  }

  // Compare array lengths
  if (prevProps.streamingData.length !== nextProps.streamingData.length) {
    return false;
  }

  // Arrays have same length and both exist
  return true;
}

export const BlockStreamHandler = memo(PureBlockStreamHandler, areEqual);
