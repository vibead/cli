cask "vibead" do
  arch arm: "arm64", intel: "x64"

  version "0.1.0-beta.12"
  sha256 arm:   "389e6591444c4fe4a0e0de97389ce7d27eb2401a8b5d232f3a15f00a72ade8a4",
         intel: "ae0dbfce66e971f04813d39d597541caa542fbad84ec2d07b41760822bcf4b0d"

  url "https://github.com/vibead/cli/releases/download/v#{version}/vibead-beta-#{version}-darwin-#{arch}.tar.gz"
  name "Vibead"
  desc "Try test ads and publisher messages in AI coding agents"
  homepage "https://github.com/vibead/cli"

  livecheck do
    url :url
    regex(/^v?(\d+(?:\.\d+)+-beta\.\d+)$/i)
    strategy :github_releases do |json, regex|
      json.filter_map do |release|
        next if release["draft"]

        release["tag_name"]&.[](regex, 1)
      end
    end
  end

  depends_on :macos

  binary "vibead-beta-darwin-#{arch}/vibead-beta", target: "vibead"
  binary "vibead-beta-darwin-#{arch}/vibead-beta"
end
