local api, fn = vim.api, vim.fn

local vscode = require("vscode.api")
local util = require("vscode.util")

local M = {}

function M.setup()
  --set group
  local group = api.nvim_create_augroup("vscode.marks", { clear = true })

  --on key press
  local waiting_for_mark = false
  vim.on_key(function(char)
    if waiting_for_mark then
      waiting_for_mark = false
      if type(char) == "string" and char:match("%a") then
        fn.VSCodeExtensionNotify("update-marks")
      end
    else
      local mode = vim.api.nvim_get_mode().mode
      if mode == "n" and char == "m" then
        waiting_for_mark = true
      end
    end
  end)

  -- on command entered
  vim.api.nvim_create_autocmd("CmdlineLeave", {
    group = group,
    callback = function()
      local cmd = fn.getcmdline()
      if cmd:match("^[%d]*ma") or cmd:match("^[%d]*k") or cmd:match("^delm") or cmd:match("^delm!") then
        fn.VSCodeExtensionNotify("update-marks")
      end
    end,
  })

  --on buffer change
  vim.api.nvim_create_autocmd({ "BufEnter" }, {
    group = group,
    callback = function()
      fn.VSCodeExtensionNotify("update-marks")
    end,
  })

  vim.api.nvim_create_autocmd("ModeChanged", {
    group = group,
    callback = function()
      -- local new_mode = vim.v.new_mode
      --
      -- if new_mode == "i" or new_mode == "v" or new_mode == "n" then
      fn.VSCodeExtensionNotify("update-marks")
      -- end
    end,
  })

  -- text change in insert mode
  vim.api.nvim_create_autocmd({ "TextChangedI" }, {
    group = group,
    callback = function()
      fn.VSCodeExtensionNotify("update-marks")
    end,
  })
end

return M
