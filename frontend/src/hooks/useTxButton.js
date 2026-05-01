import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

/**
 * Wraps wagmi's useWriteContract + useWaitForTransactionReceipt and returns a
 * compact { write, status, error, hash, isPending, isMining, isSuccess }
 * state suitable for a single button. `onSuccess` runs once per confirmation.
 */
export function useTxButton({ onSuccess } = {}) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    isLoading: isMining,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && onSuccess) onSuccess(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hash]);

  return {
    write: writeContract,
    reset,
    hash,
    isPending,
    isMining,
    isSuccess,
    error: error || receiptError,
    status: isPending
      ? "Awaiting wallet…"
      : isMining
      ? "Confirming on-chain…"
      : isSuccess
      ? "Confirmed"
      : null,
  };
}
