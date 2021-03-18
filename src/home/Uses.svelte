<script>
  import Logo from "./Logo.svelte";

  document.title = "GIBR.net: Things I use";
</script>

<main>
  <h1><Logo /> Things I use.</h1>
  <p>
    My day job is writing database abstractions for Netflix. The things I use to
    do my job are:
  </p>
  <section>
    <h2>Software</h2>
    <dl>
      <dt><a href="https://www.eclipse.org/">Eclipse</a></dt>
      <dd>
        I've been using Eclipse for decades for my work at Apple and Netflix.
      </dd>
      <dt><a href="https://www.jetbrains.com/idea/">IntelliJ Idea</a></dt>
      <dd>
        I've been trying out IntelliJ on a few new projects for the last year or
        two.
      </dd>
      <dt><a href="https://code.visualstudio.com">VisualStudio Code</a></dt>
      <dd>For all things not Java.</dd>
      <dt><a href="https://www.omnigroup.com/omnigraffle">OmniGraffle</a></dt>
      <dd>My first choice when making diagrams</dd>
      <dt><a href="https://www.google.com/chrome">Chrome</a></dt>
      <dd>default browser</dd>
      <dt><a href="https://www.sourcetreeapp.com/">SourceTree</a></dt>
      <dd>
        I still use <a
          href="https://www.perforce.com/downloads/visual-merge-tool"
          >Pefore Merge</a
        > for resolving merge conflicts.
      </dd>
    </dl>
  </section>
  <section>
    <h2>Languages & Libraries</h2>
    <ul>
      <li><a href="http://openjdk.java.net/">Java</a></li>
      <li><a href="https://nodejs.org/">Node</a></li>
      <li><a href="http://python.org/">Python</a></li>
      <li><a href="https://svelte.dev/">Svelte</a></li>
      <li><a href="https://www.typescriptlang.org/">Typescript</a></li>
      <li><a href="http://www.groovy-lang.org/">Groovy</a></li>
      <li><a href="https://github.com/ReactiveX/RxJava">RxJava</a></li>
      <li><a href="https://grpc.io/">gRPC</a></li>
      <li>
        <a href="https://developers.google.com/protocol-buffers/"
          >Protocol Bufffers</a
        >
      </li>
      <li><a href="https://www.json.org/">JSON</a></li>
      <li><a href="https://cassandra.apache.org/">Cassandra</a></li>
      <li><a href="https://www.elastic.co/elasticsearch/">ElasticSearch</a></li>
      <li><a href="http://kafka.apache.org/">Kafka</a></li>
      <li><a href="https://www.docker.com/">Docker</a></li>
      <li><a href="https://spring.io/projects/spring-boot">SpringBoot</a></li>
      <li><a href="https://reactjs.org/">React</a></li>
      <li><a href="https://github.com/">Github</a></li>
    </ul>
  </section>
  <section>
    <h2>Hardware</h2>
    <dl>
      <dt>
        <a href="https://www.apple.com/macbook-pro/">Apple: MacBook Pro</a>
      </dt>
      <dd>The 15-inch, 2019 model.</dd>
      <dt>
        <a href="https://www.belkin.com/us/p/P-F4U097/"
          >Belkin: Thunderbolt 3 Dock Pro</a
        >
      </dt>
      <dd>
        Next to the laptop this is the central hub that everything connects to.
      </dd>
      <dt>
        <a href="https://www.yubico.com/product/yubikey-5c-nano/"
          >YubiKey: 5C Nano</a
        >
      </dt>
      <dd>
        I tiny numb on the side of my laptop that I use with Netflix's two
        factor SSO.
      </dd>
      <dt><a href="http://www.filcokeyboards.co.uk/">Filco: Keyboard</a></dt>
      <dd>
        Tenkeyless size with <a
          href="https://www.cherrymx.de/en/mx-original/mx-blue.html"
          >Cherry MX Blue</a
        > switches.
      </dd>
      <dt><a href="https://www.apple.com/shop/product/MRME2LL/A">Apple: Magic Mouse 2</a></dt>
      <dd>Not the best mouse for playing Minecraft but it'll do.</dd>
      <dt>
        <a
          href="https://focusrite.com/en/usb-audio-interface/scarlett/scarlett-solo"
          >Focusrite: Scarlett-Solo
        </a>
      </dt>
      <dd>USB audio interface for my microphone and headphones.</dd>
      <dt>
        <a href="https://pro.sony/ue_US/products/headphones/mdr-7506"
          >Sony: MDR-7506</a
        >
      </dt>
      <dd>Compfy headphones for long meetings.</dd>
      <dt>
        <a
          href="https://neewer.com/collections/microphone/products/microphones-accessories-40084747"
          >Neewer: NW-700</a
        >
      </dt>
      <dd>
        Condenser microphone that I got for cheep from a co-worker a couple of
        years ago.
      </dd>
      <dt>
        <a href="https://www.lg.com/us/business/desktop-monitors/lg-34UC87M-B"
          >LG: 34" curved monitor</a
        >
      </dt>
      <dd>wide enough all my windows.</dd>
      <dt>
        <a
          href="https://www.logitech.com/en-us/products/webcams/4k-pro-magnetic-webcam.960-001292.html?crid=34"
          >Logitech: 4K pro magnetic webcam</a
        >
      </dt>
      <dd>
        Used some black magnetic tape on the top of the monitor for it to
        attach.
      </dd>
      <dt>
        <a
          href="https://www.fully.com/standing-desks/laminate-standing-desks/jarvis-adjustable-height-desk-laminate.html"
          >Fully: Jarvis Laminate Standing Desk</a
        >
      </dt>
      <dd>
        I got it with all the options:
        <ul>
          <li>60"×27" white laminate</li>
          <li>white Jarvis monitor arm</li>
          <li>cable management tray</li>
          <li>
            2 power grommets (each grommet has one NEMA 5-15, one USB-A, and one
            USB-C)
          </li>
          <li>adjustable frame 30.1" to 49.3" range</li>
          <li>height control with programmable memory</li>
          <li>adjustable Keyboard Tray</li>
        </ul>
      </dd>
      <dt><a href="https://www.att.com/internet/fiber/">AT&T: fiber</a></dt>
      <dd>wired directly to setup via ethernet</dd>
    </dl>
  </section>
</main>
