import { cloneElement, type ReactElement } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  /** The button that starts the action. It opens the confirmation instead of acting. */
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** When true there is nothing to confirm, so the trigger acts straight away. */
  skip?: boolean;
}

/** A themed, keyboard-friendly replacement for window.confirm. */
const ConfirmAction = ({ trigger, title, description, confirmLabel, onConfirm, skip }: Props) =>
  skip ? (
    cloneElement(trigger, { onClick: onConfirm })
  ) : (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction className="rounded-full" onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

export default ConfirmAction;
