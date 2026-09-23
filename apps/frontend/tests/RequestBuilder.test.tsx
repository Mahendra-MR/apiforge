import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestBuilder } from "../src/components/request-builder/RequestBuilder";
import { useRequestStore } from "../src/store/useRequestStore";

describe("RequestBuilder", () => {
  beforeEach(() => {
    useRequestStore.getState().reset();
  });

  it("renders the URL input and method select", () => {
    render(<RequestBuilder onSend={() => {}} isSending={false} />);
    expect(screen.getByPlaceholderText(/api.example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
  });

  it("disables Send while the URL is empty, enables it once typed", () => {
    render(<RequestBuilder onSend={() => {}} isSending={false} />);
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/api.example.com/i), {
      target: { value: "https://api.example.com/users" },
    });

    expect(sendButton).not.toBeDisabled();
  });

  it("calls onSend when the Send button is clicked", () => {
    const onSend = vi.fn();
    render(<RequestBuilder onSend={onSend} isSending={false} />);
    fireEvent.change(screen.getByPlaceholderText(/api.example.com/i), {
      target: { value: "https://api.example.com/users" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("shows 'Sending…' and disables Send while a request is in flight", () => {
    render(<RequestBuilder onSend={() => {}} isSending />);
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
  });

  it("switches between Params, Headers, and Body tabs", () => {
    render(<RequestBuilder onSend={() => {}} isSending={false} />);

    expect(screen.getByPlaceholderText("Key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /headers/i }));
    expect(screen.getByPlaceholderText("Key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^body$/i }));
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText(/does not have a body/i)).toBeInTheDocument();
  });

  it("sends Cmd/Ctrl+Enter as a keyboard shortcut to send the request", () => {
    const onSend = vi.fn();
    render(<RequestBuilder onSend={onSend} isSending={false} />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("imports a curl command pasted directly into the URL bar", () => {
    render(<RequestBuilder onSend={() => {}} isSending={false} />);
    const urlInput = screen.getByPlaceholderText(/api.example.com/i);

    fireEvent.paste(urlInput, {
      clipboardData: {
        getData: () =>
          `curl --request POST 'https://api.example.com/users' --header 'Authorization: Bearer abc123' --data '{"name":"John"}'`,
      },
    });

    const draft = useRequestStore.getState().draft;
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/users");
    expect(draft.authType).toBe("bearer");
    expect(draft.auth.bearer.token).toBe("abc123");
  });

  it("leaves a plain URL paste alone instead of running it through the curl parser", () => {
    render(<RequestBuilder onSend={() => {}} isSending={false} />);
    const urlInput = screen.getByPlaceholderText(/api.example.com/i);

    fireEvent.paste(urlInput, {
      clipboardData: { getData: () => "https://api.example.com/users" },
    });

    expect(useRequestStore.getState().draft.url).toBe("");
  });
});
